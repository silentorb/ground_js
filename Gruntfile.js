module.exports = function (grunt) {

  grunt.loadNpmTasks('grunt-ts')
  grunt.loadNpmTasks('grunt-contrib-concat')
  grunt.loadNpmTasks('grunt-contrib-watch')
  grunt.loadNpmTasks('grunt-contrib-copy')
  grunt.loadNpmTasks('grunt-text-replace')

  grunt.initConfig({
    ts: {
      ground: {                                 // a particular target
        src: ["lib/export.ts"],        // The source typescript files, http://gruntjs.com/configuring-tasks#files
        html: [], // The source html files, https://github.com/basarat/grunt-ts#html-2-typescript-support
//        reference: "app/code/reference.ts",  // If specified, generate this file that you can use for your reference management
        out: 'ground.js',                // If specified, generate an out.js file which is the merged js file
//        outDir: 'js',    // If specified, the generate javascript files are placed here. Only works if out is not specified
//        watch: 'test',                     // If specified, watches this directory for changes, and re-runs the current target
        options: {                    // use to override the default options, http://gruntjs.com/configuring-tasks#options
          target: 'es5',            // 'es3' (default) | 'es5'
          module: 'commonjs',       // 'amd' (default) | 'commonjs'
          sourcemap: true,          // true  (default) | false
          declaration: true,       // true | false  (default)
          comments: false,           // true | false (default)
          verbose: true
        }
      }
    },
    concat: {
      options: {
        separator: ''
      },
      ground: {
        src: ['ground_header.js', 'ground.js'],
        dest: 'ground.js'
      },
      "ground-def": {
        src: [
          'ground.d.ts',
          'lib/ground_definition_footer'
        ],
        dest: 'ground.d.ts'
      }
    },
    replace: {
      "ground-def": {
        src: ["ground.d.ts"],
        overwrite: true,
        replacements: [
          {
            from: 'defs/',
            to: ""
          },
          {
            from: '/// <reference path="mysql.d.ts" />',
            to: ""
          },
          {
            from: '/// <reference path="node.d.ts" />',
            to: ""
          }
        ]
      }
    },
    copy: {
      "ground-def": {
        files: [
          { src: 'ground.d.ts', dest: '../../defs/ground.d.ts'},
          { src: 'ground.d.ts', dest: '../lawn/defs/ground.d.ts'},
          { src: 'ground.d.ts', dest: '../vineyard/defs/ground.d.ts'},
          { src: 'ground.d.ts', dest: '../fortress/defs/ground.d.ts'}
        ]
      }
    },
    watch: {
      ground: {
        files: 'lib/**/*.ts',
        tasks: ['ground']
      }
    }
  })

  grunt.registerTask('default', ['ts:ground', 'concat:ground', 'concat:ground-def', 'replace:ground-def', 'copy:ground-def']);

}