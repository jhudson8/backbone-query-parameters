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
    }
  });

  // Load tasks from npm
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-saucelabs');

  grunt.registerTask('sauce', process.env.SAUCE_USERNAME ? ['connect:server', 'saucelabs-mocha'] : []);

  grunt.registerTask('travis', ['default', 'sauce']);

  grunt.registerTask('dev', ['jshint', 'connect:keepalive']);
  grunt.registerTask('default', ['jshint']);
};
