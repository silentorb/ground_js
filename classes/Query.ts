/**
 * Created with JetBrains PhpStorm.
 * User: Chris Johnson
 * Date: 9/18/13
 */
/// <reference path="Trellis.ts"/>
/// <reference path="Ground.ts"/>
module Ground_JS {
  class Query {
    ground:Ground;
    private trellises:Array = [];
    main_table:string;
    joins:Array = [];
    filters:Array = [];
    post_clauses:Array = [];
    limit:string;
    sources:Array = [];
    links:Array = [];
    trellis:Trellis;
    db:Database;
    include_links:boolean = true;
    fields:Array = [];
    base_path:string;
    arguments:Array = [];
    static log_queries:boolean = false;

    constructor(trellis:Trellis, base_path:string = null) {
      this.trellis = trellis;
      this.ground = trellis.ground;
      this.expansions = this.ground.expansions;
      this.db = this.ground.db;
      this.main_table = trellis.get_table_name();
      if (base_path)
        this.base_path = base_path;
      else
        this.base_path = this.trellis.name;
    }
  }