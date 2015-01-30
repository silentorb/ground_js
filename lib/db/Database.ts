/// <reference path="../references.ts"/>
/// <reference path="../../defs/mysql.d.ts"/>
/// <reference path="../../../vineyard-metahub/metahub.d.ts"/>

var when = require('when')
var mysql = require('mysql')
var sequence:any = require('when/sequence')

module Ground {
	export class Database {
		settings
		log_queries:boolean = false
		private database:string
		private pool
		private script_pool = null
		private active:boolean = false
		private active_query_count = 0
		private on_final_query:()=> void = null

		constructor(settings, database:string) {
			this.settings = settings
			this.database = database
			this.start()
		}

		add_table_to_database(table:Table, ground:Core):Promise {
			var sql = table.create_sql(ground)
			return this.query(sql)
				.then(()=>table)
		}

		add_non_trellis_tables_to_database(tables:Table[], ground:Core):Promise {
			var non_trellises = MetaHub.filter(tables, (x)=> !x.trellis)
			var promises = MetaHub.map_to_array(non_trellises, (table:Table)=> this.add_table_to_database(table, ground));
			return when.all(promises)
		}

		start() {
			if (this.active)
				return

			this.pool = mysql.createPool(this.settings[this.database])
			this.active = true
			console.log('DB connection pool created.')
		}

		close(immediate = false):Promise {
			var actions = []
			if (!immediate)
				actions.push(() => this.wait_for_remaining_queries())

			return sequence(actions.concat([
				() => this.close_all_pools(),
				()=> {
					this.active = false
					console.log('Ground DB successfully shut down.')
				}
			]))
		}

		// This function is used to avoid closing the db while connections are still being fired during tests.
		// Eventually this may need to also hook into new db queries and have a some timing
		// mechanism to see if no queries are fired after active_query_count hits zero.
		// That case might be possible with promise chains.
		private wait_for_remaining_queries():Promise {
			if (this.active_query_count == 0)
				return when.resolve()

			var def = when.defer()

			// Eventually this may be supported, but for now I don't know what would
			// cause this and if it does happen I want it analyzed before allowed.
			if (this.on_final_query)
				throw new Error("wait_for_remaining_queries was called twice.")

			this.on_final_query = ()=> {
				this.on_final_query = null
				def.resolve()
			}

			return def.promise
		}

		private close_all_pools():Promise {
			var promises = []
			if (this.pool) {
				promises.push(this.close_pool(this.pool, 'main'))
				this.pool = null
			}
			if (this.script_pool) {
				promises.push(this.close_pool(this.script_pool, 'script'))
				this.script_pool = null
			}

			return when.all(promises)
		}

		private close_pool(pool, name):Promise {
			var def = when.defer()
			pool.end((error)=> {
				if (error) {
					console.error('Error closing ' + name + ' pool:', error)
					def.reject(error)
				}

				def.resolve()
			})

			return def.promise
		}

		create_table(trellis:Trellis):Promise {
			if (!trellis)
				throw new Error('Empty object was passed to create_table().')

			var table = Table.create_from_trellis(trellis);
			var sql = table.create_sql_from_trellis(trellis);
			return this.query(sql)
				.then(()=>table)
		}

		create_trellis_tables(trellises:{[key: string]: Trellis}):Promise {
			var promises = MetaHub.map_to_array(trellises, (trellis:Trellis)=>this.create_table(trellis));
			return when.all(promises)
		}


		drop_all_tables():Promise {
			return when.map(this.get_tables(), (table) => {
				return this.query('DROP TABLE IF EXISTS `' + table + '`');
			});
		}

		get_tables():Promise {
			return when.map(this.query('SHOW TABLES'), (row) => {
				for (var i in row)
					return row[i];

				return null;
			});
		}

		query(sql:string, args:any[] = undefined, pool = undefined):Promise {
			if (!pool)
				pool = this.pool

			var def = when.defer()
			if (this.log_queries)
				console.log('start', sql)

			this.pool.query(sql, args, (err, rows, fields) => {
				this.active_query_count--
				if (this.on_final_query) {
					console.log('remaining-queries:', this.active_query_count)
					if (this.active_query_count == 0)
						this.on_final_query()
				}

				if (err) {
					console.error('error', sql)
					def.reject(err)
				}
//        console.log('sql', sql)
				def.resolve(rows, fields)

				return null
			});

			this.active_query_count++

			return def.promise
		}

		query_single(sql:string, args:any[] = undefined):Promise {
			return this.query(sql, args)
				.then((rows) => rows[0])
		}

		// Identical to query(), except that it uses a connection that allows
		// multiple SQL statements in one call.  (By default that is disabled in the main connection pool.)
		run_script(sql:string, args:any[] = undefined):Promise {
			if (!this.script_pool) {
				var settings = MetaHub.extend({}, this.settings[this.database])
				settings.multipleStatements = true
				this.script_pool = mysql.createPool(settings)
			}
			return this.query(sql, args, this.script_pool)
		}

	}
}