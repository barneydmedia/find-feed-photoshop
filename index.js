// required packages
var fs = require('fs');
var os = require('os');
var path = require('path');
var prompt = require('prompt');
var clc = require('cli-color');
var async = require('async');
var recursive = require('recursive-readdir');
var exec = require('child_process').exec;

// some basic color coding
var error = clc.red.bold;
var warn = clc.yellow;
var notice = clc.blue;

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
main.platform = os.platform();

// grab the droplet
var dropsList = fs.readdirSync('./droplet');
for (drops in dropsList) {
  if (!drops.match(/^\./)) {
    var dropName = dropsList[drops];
  }
}
main.dropletLoc = path.normalize( './droplet/' + dropName);

// grab values as cli options, prompt asks later if not supplied
if (process.argv[2]) main.searchDir = process.argv[2];
if (process.argv[3]) main.regex = process.argv[3];

// clear the CLI to clean up visually before beginning
console.log(clc.reset);

// prompt the user, search for files, then start feeding locations to the droplet
async.waterfall([function(callback) {
    prompt.start();

    var promptObj = {};

    if (!promptObj.searchDir) {
      promptObj.searchDir = {
        description: 'What is the full path of the directory you want to search? (default: desktop)'.green
      }
    }

    if (!promptObj.regex) {
      promptObj.regex = {
        description: 'What should the filepath look like? The default is "/psd$/", meaning "anything with \'psd\' on the tail end of it".'.green
      }
    }

    // arguments can be specified via CLI options or asked as questions
    if (!promptObj.searchDir || !promptObj.searchDir) {
      // ask for some user input
      prompt.get({
        properties: promptObj
      }, function(err, results) {
        if (err) console.log(err);

        console.log(clc.reset);
        console.log('User input received, searching for files (this will take a while)...');

        // callback trigers the next anonymous function
        callback(null, results);
      });
    } else {
      var results = false;
      callback(null, results);
    }
    
  }, function(arg1, callback) {
    if (!main.searchDir) main.searchDir = arg1.searchDir || path.normalize('~/Desktop');
    main.searchDir = main.searchDir.replace(/ $/, '').replace(/\\/g, '');
    
    if (!main.regex) main.regex = arg1.regex || /psd$/;

    // search for files in the specified directory
    recursive(main.searchDir, function(err, files) {
      if (err) console.log(err);

      main.files = files;
      console.log('Found ' + main.files.length + ' files in ' + main.searchDir);
      console.log('Eliminating unmatching files...');

      callback();
    });

  }, function(callback) {

      // loop through the results to eliminate unwanted files
      for (file in main.files) {
        if (!main.files[file].match(main.regex)) {
          main.files[file] = false;
        }
      }

      // clears false results from main.files
      clearFalseResults();

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

          callback();
        });
      } else {
        callback();
      }

    }, function(callback) {
      console.log('Sending to droplet...');

      // make an output folder on the desktop if it doesn't exist
      fs.exists(main.outputDir, function (exists) {
        if (!exists) {
          fs.mkdir(main.outputDir, function() {
            console.log('Output folder created on desktop...');
            callback();
          });
        } else {
          callback();
        }
      });
      
    }, function(callback) {
      // start sending to the droplet and give console feedback
      var i = 0;
      for (file in main.files) {
        i++;

        // clear the console periodically
        if (i % 10 === 0) console.log(clc.reset);

        if (main.files[file] !== false) {
          console.log(i + '/' + main.files.length + ' Sending: ' + main.files[file] + ' to ' + main.dropletLoc + '...');

          // add 'open' if on a mac
          if (main.platform == 'darwin') {

            var platformToken = 'open ';
            main.files[file] = main.files[file].replace(/ /g, '\\ ');
            main.dropletLoc = main.dropletLoc.replace(/ /g, '\\ ');

          } else {
            var platformToken = '';
          }

          console.log( clc.green( 'Executing: ' + platformToken + main.dropletLoc + ' ' + main.files[file] ) );

          setTimeout(function() {
            exec(platformToken + main.dropletLoc + ' ' + main.files[file], function (err, stdout, stderr) {
              if (err) console.log(err);
              if (stderr) console.log(stderr);
              console.log('stdout');
            });
          }, 50);
        }
      }
      console.log(clc.red('Done!'));
      callback();
    }
]);

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