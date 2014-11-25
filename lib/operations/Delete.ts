/**
 * User: Chris Johnson
 * Date: 9/25/13
 */

/// <reference path="../references.ts"/>

module Ground {
  export class Delete implements IUpdate {
    ground:Core
    trellis:Trellis
    seed
    max_depth = 20

    constructor(ground:Core, trellis:Trellis, seed:ISeed) {
      this.ground = ground
      this.trellis = trellis
      this.seed = seed
    }

    get_access_name():string {
      return this.trellis + '.delete'
    }

    private delete_child(link:Property, id, depth = 0):Promise {
      var other_property = link.get_other_property()
      var other_trellis = other_property.parent
      var query = other_trellis.ground.create_query(other_trellis.name)
      query.add_filter(other_property.name, id)
      console.log('id', id)
      return query.run({query_count: 0})
        .then((result)=> when.all(
          result.objects.map((object)=> this.run_delete(other_trellis, object, depth + 1))
        )
      )
    }

    private delete_children(trellis:Trellis, id, depth:number = 0):Promise {
      var links = this.get_child_links(trellis)
      return when.all(links.map(
        (link) => this.delete_child(link, id, depth)
      ))
    }

    delete_record(trellis:Trellis, seed):Promise {
      var keys = trellis.get_primary_keys()
      var filters = keys.map((property) => {
          var id = seed[property.name]
          if (id === undefined || id === null)
            throw new Error("Cannot delete entity. Entity is missing " + property.fullname() + ".")

          return property.query() + " = " + property.get_sql_value(id)
        }
      )

      //var id_sql = trellis.properties[trellis.primary_key].get_sql_value(id)

//      var primary_property = trellis.properties[trellis.primary_key]
      var sql = 'DELETE FROM `' + trellis.get_table_name() + '`'
        + "\nWHERE " + filters.join(' AND ')
      //+ "\nWHERE " + trellis.query_primary_key() + ' = ' + id_sql

      if (this.ground.log_updates)
        console.log(sql);

      return this.ground.db.query(sql)
    }

    private get_child_links(trellis:Trellis) {
      var result = [], links = trellis.get_links()
      for (var i in links) {
        var link = links[i]
        var other = link.get_other_property()
        // The other trellis may not have a reciprocal property
        if (other && (other.name == 'parent' || other.is_parent))
          result.push(link)
      }

      return result
    }

    run(depth:number = 0):Promise {
      var trellis = this.trellis
      var seed = this.seed
      return this.run_delete(trellis, seed, depth)
    }

    private run_delete(trellis:Trellis, seed:ISeed, depth:number = 0):Promise {
      if (depth > this.max_depth)
        throw new Error("Max depth of " + this.max_depth + " exceeded.  Possible infinite loop.")

      var pipeline:any = require('when/pipeline')
      var id = seed[trellis.primary_key]
      console.log('deleting', id)
      if (id === null || id === undefined)
        throw new Error("Object was tagged to be deleted but has no identity.")

      var property_names = MetaHub.map_to_array(trellis.get_all_properties(), (x)=> x.name)

      return trellis.assure_properties(seed, property_names)
        .then((seed)=> {
          var tree = trellis.get_tree().filter((t:Trellis)=> !t.is_virtual)
          var invoke_promises = tree.map((trellis:Trellis) => this.ground.invoke(trellis.name + '.delete', seed))

          return pipeline([
            ()=> when.all(invoke_promises),
            ()=> this.delete_children(trellis, id, depth),
            ()=> when.all(tree.map((trellis:Trellis) => this.delete_record(trellis, seed))),
            ()=> when.all(tree.map((trellis:Trellis) => this.ground.invoke(trellis.name + '.deleted', seed))),
            ()=> []
          ])
        })
    }
  }
}
