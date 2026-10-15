class Album {
    constructor(name) {
      this.name = name;
      this.votes = 0;
      this.eliminated = false;
    }
}

var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
const range = sheet.getDataRange();
const data = range.getValues();
// skip voter data columns
var albumNames = data[0].slice(2);

var albums = Array(albumNames.length);
for (let i = 0; i < albumNames.length; i++) {
    albums[i] = new Album(albumNames[i]);
}

// skip voter data columns
var votes =  data.slice(1).map(row => row.slice(2));
let majority = votes.length / 2;
parseInts();
processVotes();
// pointBasedVote();

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Functions')
  .addItem('Parse Integers from Votes', 'parseInts')
  .addItem('Ranked Choice Voting', 'processVotes')
  .addItem('Point Based Vote', 'pointBasedVote')
  .addToUi();
}


// Parse integers from the spreadsheet. Example: "1st" -> 1.
function parseInts() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const range = sheet.getDataRange();
  const data = range.getValues();
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    for (var j = 2; j < row.length; j++) {
      if (data[i][j] != "" && /^\d+(st|nd|rd|th)$/.test(data[i][j])) {
        data[i][j] = parseInt(data[i][j], 10);
      } 
    }
  range.setValues(data);
  }
}


// INSTANT RUNOFF VOTING

function processVotes() {
let round = 0;
  while (round < albums.length - 1) {
    printVotes();
    for (let i = 0; i < albums.length; i++) { // reset vote counts
      albums[i].votes = 0;
    }
    for (var i = 0; i < albums.length; i++) { // for each album
      if (albums[i].eliminated) continue;
      for (var j = 0; j < votes.length; j++) { // column number
        if (votes[j][i] === 1) {
          albums[i].votes++;
        }
      }
      Logger.log(albums[i].name + " got " + albums[i].votes + " votes");
      if (albums[i].votes > majority) {
        Logger.log(albums[i].name + " wins with " + albums[i].votes + " votes");
        SpreadsheetApp.getUi().alert("WINNER: " + albums[i].name);
        return;
      } 
    }
    
    let eliminated = albums[eliminate()];
    Logger.log("eliminated " + eliminated.name);
    redistribute(eliminated);
    round++;
  }

  let foundWinner = false;
  albums.forEach((album) => {
    if (!album.eliminated) {
      SpreadsheetApp.getUi().alert("WINNER: " + album.name);
      foundWinner = true;
      return;
    }
  })
  if (foundWinner) return;
  SpreadsheetApp.getUi().alert("ERR");
  
}

function eliminate() {
  let min = Infinity;
  minAlbum = null;
  albums.forEach((album) => {
    if (!album.eliminated) {
      if (album.votes < min) {
        min = album.votes;
        minAlbum = album;
      }
      else if (album.votes === min) {
        minAlbum = breakTie(album, minAlbum);
        min = minAlbum.votes;
      }
    }

  })
  if (minAlbum) {
    minAlbum.eliminated = true;
    return albums.indexOf(minAlbum);
  }
  return -1;
}

function breakTie(a, b) { // return the min album based on the tie break
  let albumA = albums.indexOf(a);
  let albumB = albums.indexOf(b);

  let aTotal = 0;
  let bTotal = 0;


  for (let row = 0; row < votes.length; row++) {
    if (votes[row][albumA] != "" && votes[row][albumA] != 5) {
      aTotal += 4 - votes[row][albumA];
    }
    if (votes[row][albumB] != "" && votes[row][albumB] != 5) {
      bTotal += 4 - votes[row][albumB];
    }
  }
  
  if (aTotal > bTotal) {
    return b;
  } else {
    return a;
  }

}

function redistribute(album) {
  let col = albums.indexOf(album);
  for (let row = 0; row < votes.length; row++) { // iterating through this albums votes
    let cell = votes[row][col];
    if (cell === 1) {
      votes[row][col] = 5;
      let minVal = getMinInRow(votes[row]); // get the index of the next best choice
      if (minVal < 5) {
        let nextBest = votes[row].indexOf(minVal);
        if (nextBest != -1)  votes[row][nextBest] = 1;
      }
    }
    votes[row][col] = 5;
  }

}

function getMinInRow(row) {
  let min = Infinity
  row.forEach((vote) => {
    if (vote != "") {
      if (vote < min) {
        min = vote;
      }
    }
  })
  return min;
}



// POINT BASED VOTING (DEPRECATED)

function pointBasedVote() {
  let max = 0;
  let bestAlbum = null;
  printVotes();
  albums.forEach((album) => {
    let col = albums.indexOf(album);
    album.votes = 0;
    for (let row = 0; row < votes.length; row++) {
      if (votes[row][col] != "") {
        // TEMPORARY CHANGES! 3 POINTS FOR FIRST PLACE
        if (votes[row][col] == 1) 
          album.votes += 3;
        else
          album.votes += (4 - votes[row][col]);
      }
    }
    Logger.log(album.name + " total: " + album.votes);
    if (album.votes > max) {
      max = album.votes;
      bestAlbum = album;
    }
  })
  Logger.log("Winner: " + bestAlbum.name);
  SpreadsheetApp.getUi().alert("Winner: " + bestAlbum.name);
  return;
}

function printPoints() {
  albums.forEach((album => {
    Logger.log(album.name + ": " + album.votes + " points");
  }))
}


// DEBUGGING

function printAlbums() {
  Logger.log("\nAlbums: \n");
  albums.forEach((album) => {
    Logger.log(album.name + " " + album.eliminated + "\n");
  });
  Logger.log("\n");
}

function printVotes() {
  votes.forEach((row) => {
    let str = "";
    row.forEach((col) => {
      if (col === "" || col === 5) {
        str += "  -  ";
      } else
        str += "  " + col + "  ";
    })
    Logger.log(str);
  });
}
