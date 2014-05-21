/// <reference path="../references.ts"/>

module Ground {
  export class Record_Count extends MetaHub.Meta_Object {
    ground:Core
    parent:Trellis
    child:Trellis
    count_name:string

    constructor(ground:Core, parent, property_name:string, count_name:string) {
      super()
      this.ground = ground
      this.parent = ground.sanitize_trellis_argument(parent)
      var property = this.parent.get_property(property_name)
      this.child = property.other_trellis
      this.count_name = count_name

      this.listen(ground, this.child.name + '.created', (seed, update) => this.count(seed))
      this.listen(ground, this.child.name + '.deleted', (seed, update) => this.count(seed))
    }

    count(seed):Promise {
      var back_reference = this.child.get_reference_property(this.parent)
      return this.child.assure_properties(seed, [back_reference.name])
        .then((seed)=> {
          var parent_key = back_reference.get_sql_value(seed[back_reference.name])

          var sql = "UPDATE " + this.parent.get_table_name()
            + " SET " + this.count_name + " =\n"
            + "(SELECT COUNT(*)"
            + "FROM " + this.child.get_table_name() + " WHERE " + back_reference.query() + " = " + parent_key + ")\n"
            + "WHERE " + this.parent.query_primary_key() + " = " + parent_key

          return this.ground.db.query(sql, [ parent_key ])
            .then(() => this.invoke('changed', seed[back_reference.name]))
        })
    }
  }

  class Join_Count extends MetaHub.Meta_Object {
    ground:Core
    parent:Trellis
    link:Link_Trellis
    count_name:string

    constructor(ground:Core, property:Property, count_name:string) {
      super()
      this.ground = ground
      this.parent = property.parent
      this.count_name = count_name
      this.link = Link_Trellis.create_from_property(property)
      this.link.identities.pop()

      var table_name = this.link.table_name
      this.listen(ground, table_name + '.created', (seed) => this.count(seed))
      this.listen(ground, table_name + '.removed', (seed) => this.count(seed))
    }

    count(seed):Promise {
//    console.log('!!! join')
      var trellis = this.link.trellises[0]
      var seeds = {}
      var identity = seed[trellis.primary_key]
      var key = seeds[trellis.name] = trellis.properties[trellis.primary_key].get_sql_value(identity)

      var sql =
        "UPDATE " + this.parent.get_table_name()
          + "\nSET " + this.count_name + " ="
          + "\n(SELECT COUNT(*)"
          + "\nFROM " + this.link.get_table_declaration()
          + "\nWHERE " + this.link.get_condition_string(seeds) + ")"
          + "\nWHERE " + trellis.query_primary_key() + " = " + key

      return this.ground.db.query(sql)
        .then(() => this.invoke('changed', seed))
    }
  }

  class Multi_Count extends MetaHub.Meta_Object {
    ground:Core
    trellis:Trellis
    count_name:string
    count_fields:string[]

    constructor(ground:Core, trellis:string, count_name, sources:MetaHub.Meta_Object[]) {
      super()
      this.ground = ground
      this.trellis = ground.trellises[trellis]
      this.count_name = count_name
      this.count_fields = sources.map((c)=> <string>c['count_name'])
      for (var i in sources) {
        this.listen(sources[i], 'changed', (seed) => this.count(seed))
      }
    }

    count(seed):Promise {
//    console.log('!!! multi')
      var trellis = this.trellis
      var identity = typeof seed == 'object' ? seed[trellis.primary_key] : seed
      var trellis_key = trellis.properties[trellis.primary_key].get_sql_value(identity)
      var sql = "UPDATE " + trellis.get_table_name()
        + " SET " + this.count_name + " =\n"
        + this.count_fields.join(' + ') + " "
        + "WHERE " + trellis.query_primary_key() + " = " + trellis_key

      return this.ground.db.query(sql, [ trellis_key ])
        .then(() => this.invoke('changed'))
    }
  }
}