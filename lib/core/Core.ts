/// <reference path="../references.ts"/>
/// <reference path="../db/Database.ts"/>
/// <reference path="../schema/Trellis.ts"/>
/// <reference path="../operations/Update.ts"/>
/// <reference path="../operations/Delete.ts"/>
/// <reference path="../../defs/node.d.ts"/>

module Ground {
	export class InputError {
		name = "InputError"
		message
		stack
		status = 400
		details
		key

		constructor(message:string, key = undefined) {
			this.message = message
			this.key = key
		}
	}

	export interface ISeed {
		_deleted?
		_deleted_?
		_removed_?
		__deleted__?
		__removed__?
	}

	export interface IUpdate {
		run:()=>Promise
		get_access_name():string
	}

	export function path_to_array(path) {
		if (MetaHub.is_array(path))
			return path

		path = path.trim()

		if (!path)
			throw new Error('Empty query path.')

		return path.split(/[\/\.]/)
	}

	export class Core extends MetaHub.Meta_Object {
    schema:Schema
		db:Database
		log_queries:boolean = false
		log_updates:boolean = false
		hub
		query_schema
		update_schema

		constructor(config, db_name:string) {
			super();
			this.query_schema = Core.load_relative_json_file('validation/query.json')
			this.update_schema = Core.load_relative_json_file('validation/update.json')
			this.db = new Database(config, db_name);
			var path = require('path');
			var filename = path.resolve(__dirname, 'property_types.json');
			this.schema.load_property_types(filename)
		}

		private static load_relative_json_file(path) {
			var Path = require('path');
			var fs = require('fs')
			return JSON.parse(fs.readFileSync(Path.resolve(__dirname, path), 'ascii'))
		}

		get_identity(trellis:string, seed) {
			return this.get_trellis(trellis).get_identity2(seed)
		}

		get_trellis(trellis):Trellis {
			return this.schema.get_trellis(trellis)
		}

		private create_remaining_tables() {
      var schema = this.schema
			for (var i in schema.trellises) {
				var trellis = schema.trellises[i]
				if (schema.tables[trellis.name])
					continue

				var table = Table.create_from_trellis(trellis, this.schema)
        schema.tables[i] = table
			}
		}

		private create_missing_table_links() {
      var schema = this.schema
      for (var i in schema.trellises) {
				var trellis = schema.trellises[i]
				var table = schema.tables[trellis.name]
				var links = trellis.get_all_links()
				for (var p in links) {
					if (!table.links[p])
						table.create_link(links[p])
				}
			}
		}

		create_query(trellis_name:string, base_path = ''):Query_Builder {
			var trellis = this.sanitize_trellis_argument(trellis_name);

			return new Query_Builder(trellis, this);
		}

		create_update(trellis, seed:ISeed = {}, user:IUser = null):IUpdate {
			trellis = this.sanitize_trellis_argument(trellis)

			// If _deleted is an object then it is a list of links
			// to delete which will be handled by Update.
			// If _delete is simply true then the seed itself is marked for deletion.
			if (seed._deleted === true
				|| seed._deleted === 'true'
				|| seed._deleted_ === true
				|| seed._deleted_ === 'true'
				|| seed.__deleted__ === true
				|| seed.__deleted__ === 1)
				return new Delete(this, trellis, seed)

			var update = new Update(trellis, seed, this)
			update.user = user
			update.log_queries = this.log_updates
			return update
		}

		delete_object(trellis:Trellis, seed:ISeed):Promise {
			var trellis = this.sanitize_trellis_argument(trellis)
			var del = new Delete(this, trellis, seed)
			return del.run()
		}

		insert_object(trellis, seed:ISeed = {}, user:IUser = null, as_service = false):Promise {
			return this.update_object(trellis, seed, user, as_service);
		}

		static is_private(property:Property):boolean {
			return property.is_private;
		}

		static is_private_or_readonly(property:Property):boolean {
			return property.is_private || property.is_readonly;
		}

		update_object(trellis, seed:ISeed = {}, user:IUser = null, as_service:boolean = false):Promise {
			trellis = this.sanitize_trellis_argument(trellis);

			// If _deleted is an object then it is a list of links
			// to delete which will be handled by Update.
			// If _delete is simply true then the seed itself is marked for deletion.
			if (seed._deleted === true || seed._deleted === 'true'
				|| seed._deleted_ === true || seed._deleted_ === 'true'
				|| seed.__deleted__ === true || seed.__deleted__ === 1
			)
				return this.delete_object(trellis, seed);

			var update = new Update(trellis, seed, this);
			update.user = user
			update.log_queries = this.log_updates
//      this.invoke(trellis.name + '.update', seed, trellis);
			return update.run();
		}

		static load_json_from_file(filename:string) {
			var fs = require('fs')
			var json = fs.readFileSync(filename, 'ascii');
			if (!json)
				throw new Error('Could not find file: ' + filename)

			return JSON.parse(json);
		}

//    load_metahub_file(filename:string) {
//      var fs = require('fs')
//      var code = fs.readFileSync(filename, { encoding: 'ascii' })
//      var match = this.hub.parse_code(code)
//      var block = match.get_data()
//
////      console.log('data', require('util').inspect(block.expressions, true, 10))
//      Logic.load2(this, block.expressions)
//    }

		load_schema_from_file(filename:string) {
			var data = Core.load_json_from_file(filename);
			this.schema.parse_schema(data, this)

      this.create_remaining_tables()
      this.create_missing_table_links()
		}

		load_tables(tables:any[]) {
      var schema = this.schema
			for (var name in tables) {
				var table = new Table(name, schema);
				table.load_from_schema(tables[name]);
        schema.tables[name] = table;
        schema.custom_tables[name] = table;
			}
		}

		static remove_fields(object, trellis:Trellis, filter) {
			for (var key in object) {
				var property = trellis.properties[key];
				if (property && filter(property))
					delete object[key];
			}
			return object;
		}

		// Deprecated in favor of get_trellis()
		sanitize_trellis_argument(trellis):Trellis {
			return this.get_trellis(trellis)
		}

		stop() {
			this.db.close()
		}

		export_schema():ISchema_Source {
			return {
				trellises: MetaHub.map(this.schema.trellises, (trellis) => trellis.export_schema())
			}
		}

		static perspective(seed, trellis:Trellis, property:Property) {
			if (trellis === property.parent) {
				return seed
			}
			else {
				var result = {}
				var other_property = property.get_other_property()

				var identity = seed[other_property.name]
				var reference = seed[other_property.parent.primary_key]

				if (other_property.type == 'list') {
					result[property.parent.primary_key] = identity[0]
					result[other_property.name] = [reference]
				}
				else {
					result[property.parent.primary_key] = identity
					result[other_property.name] = reference
				}

				return result
			}
		}

    create_table(trellis:Trellis):Promise {
      if (!trellis)
        throw new Error('Empty object was passed to create_table().')

      var table = Table.create_from_trellis(trellis, this.schema);
      var sql = table.create_sql_from_trellis(trellis);
      return this.db.query(sql)
        .then(()=>table)
    }

    create_trellis_tables(trellises:{[key: string]: Trellis}):Promise {
      var promises = MetaHub.map_to_array(trellises, (trellis:Trellis)=>this.create_table(trellis));
      return when.all(promises)
    }

    assure_properties(trellis:Trellis, seed, required_properties:string[]):Promise {
      if (trellis.seed_has_properties(seed, required_properties))
        return when.resolve(seed)

      var properties = [], expansions = []
      for (var i = 0; i < required_properties.length; ++i) {
        var property:string = required_properties[i]
        if (property.indexOf('.') == -1) {
          properties.push(property)
        }
        else {
          var tokens = property.split('.')
          expansions.push(tokens.slice(0, -1).join('/'))
          properties.push(tokens[0])
        }
      }

      var query = this.create_query(trellis.name)
      query.add_key_filter(trellis.get_identity2(seed))
      query.extend({
        properties: properties
      })
      query.add_expansions(expansions)

      return query.run_single(null)
    }
	}
}

module.exports = Ground