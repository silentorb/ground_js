/// <reference path="../references.ts"/>

module Ground {

  export class Query_Runner {
    source:Query_Builder
    run_stack
    private row_cache
    ground:Core
    renderer:Query_Renderer

    constructor(source:Query_Builder) {
      this.source = source
      this.ground = source.ground
      this.renderer = new Query_Renderer()
    }

    run_core(source:Query_Builder):Promise {
      if (this.row_cache)
        return when.resolve(this.row_cache)

      var tree = source.trellis.get_tree()
      var promises = tree.map((trellis:Trellis) => this.ground.invoke(trellis.name + '.query', source))

      return when.all(promises)
        .then(()=> {
          var sql = this.renderer.generate_sql(source)
          sql = sql.replace(/\r/g, "\n");
          if (this.ground.log_queries)
            console.log('query', sql);

//          var args = MetaHub.values(this.arguments).concat(args);
          return this.ground.db.query(sql)
            .then((rows)=> {
              this.row_cache = rows
              return rows
            })
        })
    }

    run(source:Query_Builder):Promise {
      if (this.ground.log_queries) {
        var temp = new Error()
        this.run_stack = temp['stack']
      }

      var properties = source.trellis.get_all_properties();
      return this.run_core(source)
        .then((rows) => when.all(rows.map((row) => this.process_row(row))))
    }

    run_single(source:Query_Builder):Promise {
      return this.run(source)
        .then((rows)=> rows[0])
    }
  }
}