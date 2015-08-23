var childProcess = require('child_process');

module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      files: [
        'backbone.queryparams.js',
        'test/*.js'
      ]
    },

    connect: {
      options: {
        base: '.',
        hostname: '*',
        port: 9999
      },
      server: {},
      keepalive: {
        options: {
          keepalive: true
        }
      }
    },
    'saucelabs-qunit': {
      options: {
        testname: 'backbone-query-parameters',
        build: process.env.TRAVIS_JOB_ID,
        detailedError: true,
        concurrency: 4
      },
      'backbone-1.0': {
        options: {
          tags: ['1.0'],
          urls: [
            'http://localhost:9999/test/test.html'
          ],
          browsers: [
            {browserName: 'chrome'},
            {browserName: 'firefox', platform: 'Linux'},
            {browserName: 'safari'},
            {browserName: 'opera'},
            {browserName: 'internet explorer', version: 11, platform: 'Windows 8.1'},
            {browserName: 'internet explorer', version: 8, platform: 'XP'}
          ]
        }
      },
      'backbone-1.1': {
        options: {
          tags: ['1.1'],
          urls: [
            'http://localhost:9999/test/test-1.1.html'
          ],
          browsers: [
            // IE8 backbone core tests fail due to the long running script blocker triggering
            {browserName: 'chrome'},
            {browserName: 'firefox'},
            {browserName: 'safari'},
            {browserName: 'opera'},
            {browserName: 'internet explorer', version: 11, platform: 'Windows 8.1'},
            {browserName: 'internet explorer', version: 10, platform: 'Windows 8'},
            {browserName: 'internet explorer', version: 9, platform: 'Windows 7'},
          ]
        }
      }
    },

    closureCompiler: {
		options: {
			compilerFile: 'lib/compiler.jar',

			checkModified: true,
			
			compilerOpts: {
				compilation_level: 'SIMPLE_OPTIMIZATIONS',
				language_in: 'ECMASCRIPT5',
				create_source_map: 'backbone.queryparams.min.map'
			}
		},
		
		dist: {
			src: 'backbone.queryparams.js',
			dest: 'backbone.queryparams.min.js'
		}
	}
  });

  // Load tasks from npm
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-saucelabs');
  grunt.loadNpmTasks('grunt-closure-tools');

  grunt.registerTask('sauce', process.env.SAUCE_USERNAME ? ['connect:server', 'saucelabs-qunit:backbone-1.0', 'saucelabs-qunit:backbone-1.1'] : []);

  grunt.registerTask('travis', ['sauce']);

  grunt.registerTask('minify', ['closureCompiler']);
  
  grunt.registerTask('dev', ['jshint', 'connect:keepalive']);
  grunt.registerTask('default', ['jshint', 'minify']);
};
