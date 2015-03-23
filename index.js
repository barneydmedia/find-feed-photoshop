// required packages
var fs = require('fs');
var os = require('os');
var path = require('path');
var prompt = require('prompt');
var clc = require('cli-color');
var async = require('async');
var recursive = require('recursive-readdir');

// make new lines render correctly cross platform
var os = require('os'), EOL = os.EOL;

// structure
var main = {};
main.files;
main.searchDir;
main.regex;
main.copyDir;
main.outputDir = path.normalize('./output');
main.tempDir = os.tmpdir();

// clear the CLI to clean up visually before beginning
console.log(clc.reset);

// prompt the user, search for files, then start feeding locations to the droplet
async.waterfall([function(callback) {
    prompt.start();

    // ask for some user input
    prompt.get({
      properties: {
        searchDir: {
          description: 'What is the full path of the directory you want to search?'.green,
          message: 'This field is required.',
          required: true
        },
        copyDir: {
          description: 'Would you like the output files automatically moved somewhere other than this output folder? (give full path)'.green
        },
        regex: {
          description: 'What should the filepath look like? The default is "/psd$/", meaning "anything with \'psd\' on the tail end of it".'.green
        }
      }
    }, function(err, results) {
      if (err) console.log(err);

      console.log(clc.reset);
      console.log('User input received, searching for files...');

      // callback trigers the next anonymous function
      callback(null, results);
    });
    
  }, function(arg1, callback) {
    main.searchDir = arg1.searchDir.replace(/ $/, '');
    main.searchDir = main.searchDir.replace(/\\/, '');
    main.regex = arg1.regex || /psd$/;
    main.copyDir = arg1.copyDir || false;

    // search for files in the specified directory
    recursive(main.searchDir, function(err, files) {
      if (err) console.log(err);

      main.files = files;
      console.log('Found ' + main.files.length + ' files in ' + main.searchDir);
      console.log('Beginning processing...');

      callback();
    }, function(callback) {

      console.log(clc.reset);
      console.log('Files before cleanup: ');
      console.log(main.files);

      // loop through the results to eliminate unwanted files
      for (file in main.files) {
        if (!main.files[file].match(main.regex)) {
          main.files[file] = false;
        }
      }

      // clears false results from main.files
      clearFalseResults();

      console.log('Files after first clear: ');
      console.log(main.files);

      // make sure the files don't already exist in the output directory
      if (main.copyDir) {
        recursive(main.copyDir, function(err, copyDirFiles) {
          if (err) console.log(err);

          var tempArr = [];
          for (file in copyDirFiles) {
            var offset = main.files.indexOf( copyDirFiles[file] );
            if ( offset >= 0 ) {
              main.files[offset] = false;
            }
          }

          // clears false results from main.files
          clearFalseResults();

          console.log('Files after second clear: ');
          console.log(main.files);

          callback();
        });
      } else {
        callback();
      }

    }, function(callback) {
      console.log('Beginning processing...');
      for (file in main.files) {
        if (main.files[file]) console.log('TODO: This is normally where ' + main.files[file] + ' would be processed.');
      }
      
    });
}]);

function clearFalseResults() {
  // store matches only
  var tempArr = [];
  for (file in main.files) {
    if (main.files[file] !== false) {
      tempArr.push(main.files[file]);
    }
  }

  main.files = tempArr;
}