'use strict';

module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  var src = ['test/manager/taskManager.js', 'test/filters/*.js',
             'test/remote/*.js', 'test/service/*.js', 'test/modules/*.js',
             'test/util/*.js', 'test/*.js'];


  // Project configuration.
  // Coverage is generated via: npm run test:coverage (uses c8, no blanket)
  grunt.initConfig({
    mochaTest: {
      test: {
        options: {
          reporter: 'spec',
          timeout: 5000
        },
        src: src
      }
    },
    clean: {
      coverage: {
        src: ['coverage']
      }
    },
    jshint: {
      all: ['lib/*'],
      options: {
        node: true,
        sub: true,
        esversion: 6,
        asi: true,
        validthis: true,
        loopfunc: true
      }
    }
  });

  // Default task.
  grunt.registerTask('default', ['clean', 'mochaTest', 'jshint']);
};
