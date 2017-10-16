#!/usr/bin/node
const board = (process.argv[2] || "all").toLowerCase(),
  child_process = require("child_process"),
  fs = require("fs");

let boards = JSON.parse(fs.readFileSync("boards.json")),
  boardIndex = boards.findIndex(function(item) {
    return item.board.toLowerCase() == board.toLowerCase();
  });

if (board != "all" && (!board || boardIndex == -1)) {
  console.log([
    "usage: ./board-release.js board-file|all",
    "",
    "Available board-files:\n"
  ].join("\n"));
  boards.forEach(function(board) {
    console.log("  " + board.board + "\n" +
      "    " + board.title + "\n");
  });
  process.exit(0);
}

if (boardIndex != -1) {
  boards = [ boards[boardIndex] ];
}

console.log("Building for '" + board + "'");

try {
  fs.mkdirSync("build");
} catch (___) {
}

function execPromise(cmdLine) {
  let args = cmdLine.split(" "),
    cmd = args.shift();
  return new Promise(function(resolve, reject) {
    child_process.execFile(cmd, args, function (error, stdout, stderr) {
      if (error) {
        return reject(error);
      }

      resolve();
    });
  });
}

function build(boardDir) {
  return new Promise(function(resolve, reject) {
    try {
      process.chdir("build/" + boardDir);
    } catch (error) {
      return reject(error);
    }
    return resolve();
  }).then(function() {
    console.log("Installing bower components...");
    return execPromise("bower install");
  }).then(function() {
    console.log("Building...");
    return execPromise("polymer build");
  }).then(function() {
    try {
      process.chdir("..");
    } catch (error) {
      return Promise.reject(error);
    }
  });
}


let boardDir = "board-explorer-" + board, releaseVersion = 0,
  files = fs.readdirSync(".");

/* Walk the releases/ directory looking for built versions */
let regex = new RegExp("^" + boardDir + "([0-9])*\.tgz$");
files.forEach(function(path) {
  let matches = regex.exec(path);
  if (matches && matches[1] > boardVersion) {
    releaseVersion = parseInt(matches[1]);
  }
});
releaseVersion++;

boardDir = boardDir + "-" + releaseVersion;

Promise.resolve().then(function() {
//  return execPromise("git checkout-index -a -f --prefix=build/" + boardDir + "/");
}).then(function() {
//  return build(boardDir);
}).then(function() {
  try {
    fs.writeFileSync("build/" + boardDir + "/boards.json", JSON.stringify(boards));
  } catch (error) {
    console.log(process.cwd());
    return Promise.reject(error);
  }
  return Promise.resolve();
}).then(function() {
  if (board != "all") {
    let contents;
    try {
      content = fs.readFileSync("build/" + boardDir + "/single-board.html");
      content = content.replace(
            /<board-explorer-app /g,
            "<board-explorer single-board='" + board + "' ");

      fs.writeFileSync("build/" + boardDir + "/single-board.html", content);
    } catch (error) {
      return Promise.reject(error);
    }
  }
}).then(function() {
  return execPromise("tar czvf " + boardDir + ".tgz -C build " + boardDir);
}).then(function() {
  return execPromise([
      "git tag",
      "-a v" + boardDir,
      "-m 'Tagged-v" + releaseVersion + "-for-" + board + "'"
    ].join(" "));
}).catch(function(error) {
  console.error(error);
});