module.exports = function (grunt) {

  grunt.loadNpmTasks('grunt-ts')
  grunt.loadNpmTasks('grunt-contrib-watch')
  grunt.loadNpmTasks('grunt-text-replace')

  grunt.initConfig({
    ts: {
      landscape: {                                 // a particular target
        src: ["lib/landscape/Schema.ts"],        // The source typescript files, http://gruntjs.com/configuring-tasks#files
        out: 'dist/landscape.js',                // If specified, generate an out.js file which is the merged js file
//        outDir: 'js',    // If specified, the generate javascript files are placed here. Only works if out is not specified
        options: {                    // use to override the default options, http://gruntjs.com/configuring-tasks#options
          target: 'es5',            // 'es3' (default) | 'es5'
          module: 'commonjs',       // 'amd' (default) | 'commonjs'
          sourcemap: true,          // true  (default) | false
          declaration: true,       // true | false  (default)
          verbose: true,
          removeComments: false
        }
      },
      mining: {                                 // a particular target
        src: ["lib/mining/Miner.ts"],        // The source typescript files, http://gruntjs.com/configuring-tasks#files
        out: 'dist/mining.js',                // If specified, generate an out.js file which is the merged js file
//        outDir: 'js',    // If specified, the generate javascript files are placed here. Only works if out is not specified
        options: {                    // use to override the default options, http://gruntjs.com/configuring-tasks#options
          target: 'es5',            // 'es3' (default) | 'es5'
          module: 'commonjs',       // 'amd' (default) | 'commonjs'
          sourcemap: true,          // true  (default) | false
          declaration: true,       // true | false  (default)
          verbose: true,
          removeComments: false
        }
      },
      ground: {                                 // a particular target
        src: ["lib/core/Core.ts"],        // The source typescript files, http://gruntjs.com/configuring-tasks#files
        out: 'dist/ground.js',                // If specified, generate an out.js file which is the merged js file
//        outDir: 'js',    // If specified, the generate javascript files are placed here. Only works if out is not specified
        options: {                    // use to override the default options, http://gruntjs.com/configuring-tasks#options
          target: 'es5',            // 'es3' (default) | 'es5'
          module: 'commonjs',       // 'amd' (default) | 'commonjs'
          sourcemap: true,          // true  (default) | false
          declaration: true,       // true | false  (default)
          verbose: true,
          removeComments: false
        }
      },
      db: {                                 // a particular target
        src: ["lib/db/Database.ts"],        // The source typescript files, http://gruntjs.com/configuring-tasks#files
        out: 'dist/db.js',                // If specified, generate an out.js file which is the merged js file
//        outDir: 'js',    // If specified, the generate javascript files are placed here. Only works if out is not specified
        options: {                    // use to override the default options, http://gruntjs.com/configuring-tasks#options
          target: 'es5',            // 'es3' (default) | 'es5'
          module: 'commonjs',       // 'amd' (default) | 'commonjs'
          sourcemap: true,          // true  (default) | false
          declaration: true,       // true | false  (default)
          verbose: true,
          removeComments: false
        }
      }
    },
    replace: {
      "ground": {
        src: 'dist/ground.js',
        overwrite: true,
        replacements: [
          {
            from: '///***',
            to: ""
          }
        ]
      },
      "mining": {
        src: 'dist/mining.js',
        overwrite: true,
        replacements: [
          {
            from: '///***',
            to: ""
          }
        ]
      },
      "landscape": {
        src: 'dist/landscape.js',
        overwrite: true,
        replacements: [
          {
            from: '///***',
            to: ""
          }
        ]
      },
      "db": {
        src: 'dist/db.js',
        overwrite: true,
        replacements: [
          {
            from: '///***',
            to: ""
          }
        ]
      }
    },
    watch: {
      ground: {
        files: ['lib/core/**/*.ts', 'lib/operations/**/*.ts'],
        tasks: 'ground'
      },
      mining: {
        files: 'lib/mining/**/*.ts',
        tasks: 'mining'
      },
      landscape: {
        files: 'lib/landscape/**/*.ts',
        tasks: 'landscape'
      },
      db: {
        files: 'lib/db/**/*.ts',
        tasks: 'db'
      }
    }
  })

  grunt.registerTask('ground', ['ts:ground', 'replace:ground',]);
  grunt.registerTask('db', ['ts:db', 'replace:db']);
  grunt.registerTask('mining', ['ts:mining', 'replace:mining']);
  grunt.registerTask('landscape', ['ts:landscape', 'replace:landscape', 'mining']);

  grunt.registerTask('default', 'landscape');

}