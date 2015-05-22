/// <reference path="../references.ts"/>
/// <reference path="../db/Database.ts"/>
/// <reference path="../schema/Trellis.ts"/>
/// <reference path="../query/Query.ts"/>
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

	export interface IProperty_Source {
		name?:string
		type:string
		insert?:string
		is_virtual?:boolean
		is_readonly?:boolean
		is_private?:boolean
		other_property?:string
		trellis?:string
		allow_null?:boolean
	}

	export interface ITrellis_Source {
		parent?:string
		name?:string
		primary_key?:string
		properties?
		is_virtual?:boolean
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

	export interface ISchema_Source {
		trellises?
		tables?
		views?
		logic?
	}

	export function path_to_array(path) {
		if (MetaHub.is_array(path))
			return path

		path = path.trim()

		if (!path)
			throw new Error('Empty query path.')

		return path.split(/[\/\.]/)
	}

	export class Property_Type {
		name:string;
		property_class;
		field_type;
		default_value;
		parent:Property_Type;
		db:Database;
		allow_null:boolean = false

		constructor(name:string, info, types:Property_Type[]) {
			if (info.parent) {
				var parent = types[info.parent];
				MetaHub.extend(this, parent);
				this.parent = parent;
			}

			this.field_type = info.field_type || null;

			this.name = name
			this.property_class = 'Property'
			if (info.default !== undefined)
				this.default_value = info.default

			if (info.allow_null !== undefined)
				this.allow_null = info.allow_null
		}

		get_field_type() {
			if (this.field_type) {
				return this.field_type;
			}

			if (this.parent) {
				return this.parent.get_field_type();
			}

			throw new Error(this.name + " could not find valid field type.");
		}
	}

	export class Core extends MetaHub.Meta_Object {
		trellises:{ [key: string]: Trellis
		} = {}
		custom_tables:Table[] = []
		tables:Table[] = []
		views:any[] = []
		property_types:Property_Type[] = []
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
			this.load_property_types(filename)
		}

		private static load_relative_json_file(path) {
			var Path = require('path');
			var fs = require('fs')
			return JSON.parse(fs.readFileSync(Path.resolve(__dirname, path), 'ascii'))
		}

		add_trellis(name:string, source:ITrellis_Source, initialize_parent = true):Trellis {
			var trellis = this.trellises[name]

			if (trellis) {
				trellis = this.trellises[name]
				if (source)
					trellis.load_from_object(source)

				return trellis
			}

			trellis = new Trellis(name, this);
			if (source)
				trellis.load_from_object(source);

			this.trellises[name] = trellis;

			if (initialize_parent)
				this.initialize_trellises([trellis], this.trellises);

			return trellis;
		}

		get_base_property_type(type) {
			var property_type = this.property_types[type];
			if (property_type.parent)
				return this.get_base_property_type(property_type.parent.name)

			return property_type
		}

		get_identity(trellis:string, seed) {
			return this.get_trellis(trellis).get_identity2(seed)
		}

		get_trellis(trellis):Trellis {
			if (!trellis)
				throw new Error('Trellis argument is empty');

			if (typeof trellis === 'string') {
				if (!this.trellises[trellis])
					throw new Error('Could not find trellis named: ' + trellis + '.');

				return this.trellises[trellis];
			}

			return trellis;
		}

		convert_value(value, type) {
			if (value === undefined || value === null || value === false) {
				if (type == 'bool')
					return false;

				return null;
			}

			var property_type = this.property_types[type];

			if (property_type && property_type.parent)
				return this.convert_value(value, property_type.parent.name);

			switch (type) {
				case 'date':
				case 'time':
				case 'datetime2':
				case 'guid':
					return value
				case 'list':
				case 'reference':
					return value;
				case 'number': // Just for formatting values on the fly using typeof
				case 'int':
					return Math.round(value);
				case 'string':
				case 'text':
					return value;
				case 'boolean': // Just for formatting values on the fly using typeof
				case 'bool':
					return Core.to_bool(value);
				case 'float':
				case 'double':
				case 'money':
					return parseFloat(value.toString());
        case 'json':
          var bin = new Buffer(value, 'binary').toString()
          var json = new Buffer(bin, 'base64').toString('ascii');
          return JSON.parse(json);
			}

			throw new Error('Not sure how to convert sql type of ' + type + '.')
//      return null;
		}

		private create_remaining_tables() {
			for (var i in this.trellises) {
				var trellis = this.trellises[i]
				if (this.tables[trellis.name])
					continue

				var table = Table.create_from_trellis(trellis, this)
				this.tables[i] = table
			}
		}

		private create_missing_table_links() {
			for (var i in this.trellises) {
				var trellis = this.trellises[i]
				var table = this.tables[trellis.name]
				var links = trellis.get_all_links()
				for (var p in links) {
					if (!table.links[p])
						table.create_link(links[p])
				}
			}
		}

		create_query(trellis_name:string, base_path = ''):Query_Builder {
			var trellis = this.sanitize_trellis_argument(trellis_name);

			return new Query_Builder(trellis);
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

		initialize_trellises(subset:Trellis[], all = null) {
			all = all || subset;

			for (var i in subset) {
				var trellis = subset[i];
				trellis.initialize(all)
			}
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

		load_property_types(filename:string) {
			var property_types = Core.load_json_from_file(filename);
			for (var name in property_types) {
				var info = property_types[name];
				var type = new Property_Type(name, info, this.property_types);
				this.property_types[name] = type;
			}
		}

		load_schema_from_file(filename:string) {
			var data = Core.load_json_from_file(filename);
      try {
        this.parse_schema(data)
      }
      catch(ex) {
        ex.message = "Error parsing "+ filename + ": " + ex.message
        throw ex
      }
		}

		load_tables(tables:any[]) {
			for (var name in tables) {
				var table = new Table(name, this);
				table.load_from_schema(tables[name]);
				this.tables[name] = table;
				this.custom_tables[name] = table;
			}
		}

		load_trellises(trellises:ITrellis_Source[]):Trellis[] {
			var subset = [];
			for (var name in trellises) {
				var trellis = this.add_trellis(name, trellises[name], false);
				subset[name] = trellis;
			}

			return subset
		}

		private parse_schema(data:ISchema_Source) {
			var subset:Trellis[] = null
			if (data.trellises)
				subset = this.load_trellises(data.trellises);

			if (data.views)
				this.views = this.views.concat(data.views);

			if (data.tables)
				this.load_tables(data.tables);

			if (subset)
				this.initialize_trellises(subset, this.trellises);

			if (MetaHub.is_array(data.logic) && data.logic.length > 0) {
				Logic.load(this, data.logic)
			}

			this.create_remaining_tables()
			this.create_missing_table_links()
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

		static to_bool(input) {
			if (typeof input == 'string') {
				return input.toLowerCase() == 'true';
			}

			return !!input;
		}

		export_schema():ISchema_Source {
			return {
				trellises: MetaHub.map(this.trellises, (trellis) => trellis.export_schema())
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

		harden_schema() {
			for (var i in this.trellises) {
				this.trellises[i].harden()
			}
		}

	}
}

module.exports = Ground