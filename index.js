'use strict';

if (typeof window != 'object') {
  var glob = require('' + 'glob');
  var path = require('' + 'path');
}


module.exports = jsonSchemaTest;


function jsonSchemaTest(validators, opts) {
  var assert = opts.assert || require('' + 'assert');

  describe(opts.description || 'JSON schema tests', function() {
    if (opts.timeout) this.timeout(opts.timeout);
    for (var suiteName in opts.suites)
      addTests(suiteName, opts.suites[suiteName]);
  });


  function addTests(suiteName, filesOrPath) {
    describe(suiteName, function() {
      var files = Array.isArray(filesOrPath)
                  ? filesOrPath
                  : getTestFiles(filesOrPath);

      files.forEach(function (file) {
        var filter = {
          skip: opts.skip && opts.skip.indexOf(file.name) >= 0,
          only: opts.only && opts.only.indexOf(file.name) >= 0
        }

        skipOrOnly(filter, describe)(file.name, function() {
          if (file.test) {
            var testSets = file.test;
          } else if (file.path) {
            var testPath = file.path
              , testDir = path.dirname(testPath);
            var testSets = require(testPath);
          }
          testSets.forEach(function (testSet) {
            skipOrOnly(testSet, describe)(testSet.description, function() {
              testSet.tests.forEach(function (test) {
                skipOrOnly(test, it)(test.description, function() {
                  if (Array.isArray(validators)) validators.forEach(doTest)
                  else doTest(validators)
                });

                function doTest(validator) {
                  if (test.dataFile) {
                    var dataFile = path.resolve(testDir || '', test.dataFile);
                    var data = require(dataFile);
                  } else
                    var data = test.data;
                  var valid = validator.validate(testSet.schema, data);
                  var passed = valid == test.valid;
                  if (!passed && opts.log !== false)
                    console.log('result:', valid, '\nexpected: ', test.valid, '\nerrors:', validator.errors);
                  if (valid) assert(!validator.errors || validator.errors.length == 0);
                  else assert(validator.errors.length > 0);

                  var result = {
                    validator: validator,
                    schema: testSet.schema,
                    data: data,
                    valid: valid,
                    expected: test.valid,
                    errors: validator.errors,
                    passed: passed
                  };

                  if (opts.afterEach) opts.afterEach(result);
                  if (opts.afterError && !passed) opts.afterError(result);

                  assert.equal(valid, test.valid);
                }
              });
            });
          });
        });
      });
    });
  }


  function skipOrOnly(filter, func) {
    return filter.only ? func.only : filter.skip ? func.skip : func;
  }


  function getTestFiles(testsPath) {
    var files = glob.sync(testsPath, { cwd: opts.cwd });
    return files.map(function (file) {
      var match = file.match(/(\w+\/)\w+\.json/)
      var folder = match ? match[1] : '';
      if (opts.hideFolder && folder == opts.hideFolder) folder = '';
      return {
        path: path.join(opts.cwd, file),
        name: folder + path.basename(file, '.json')
      };
    });
  }
}
