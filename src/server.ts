import WebSocket from 'ws';
import express from 'express';

const cors = require('cors');
const app = express();
const server = app.listen(3000, () => {
  console.log('WebSocket server is running on port 3000');
});
const wss = new WebSocket.Server({ server });
const voteResults: { [key: string]: { [key: string]: number } } = {};
const votedNames: { [key: string]: boolean } = {};
const namesForDraw: string[] = [];
// 存储玩家的选择
const playerChoices: { [key: string]: string } = {};
let currentVoteTopic: string | null = null;

app.use(cors());

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    if (typeof message === 'string') {
      const messageString: string = message as string;
      console.log(`Received: ${messageString}`);
      ws.send(`You sent: ${messageString}`);
    } else if (message instanceof Buffer) {
      const messageBuffer: Buffer = message as Buffer;
      console.log('Received binary data');
    } else {
      console.log('Received message of unknown type');
    }
  });
});

// 先判斷要怎樣投票的API (贊成反對 / 剪刀石頭布 / 抽籤)
app.get('/api/start-vote', (req, res) => {
  const voteType = req.query.voteType;
  const topic = req.query.topic as string;
  if (voteType === 'agreeOrDisagree') {
    for (const key of Object.keys(voteResults)) {
      for (const choice of Object.keys(voteResults[key])) {
        voteResults[key][choice] = 0;
      }
      currentVoteTopic = topic;
    }
    res.json({ message: `Voting started for AgreeOrDisagree with topic: ${topic}.` });
  } else if (voteType === 'rockPaperScissors') {
    currentVoteTopic = topic;
    res.json({ message: `Voting started for RockPaperScissors with topic: ${topic}.` });
  } else if (voteType === 'lottery') {
    currentVoteTopic = topic;
    res.json({ message: `Voting started for Lottery with topic: ${topic}.` });
  } else {
    res.status(400).json({ message: 'Invalid vote type.' });
  }
});


// 贊成反對+剪刀石頭布的API (有總數的那種)
app.post('/api/submit-vote', express.json(), (req, res) => {
  const name = req.body.name;
  const choice = req.body.choice; // 从请求体中获取用户的选择
  if (votedNames[name]) {
    res.status(400).json({ message: 'You have already voted.' });
    return;
  }
  if (name in voteResults) {
    voteResults[name][choice]++;
  } else {
    voteResults[name] = { rock: 0, paper: 0, scissors: 0 };
    voteResults[name][choice] = 1;
  }
  votedNames[name] = true;
  res.json({ message: 'Vote submitted.' });
});

// 剪刀石頭布api
app.post('/api/rockPaperScissors', express.json(), (req, res) => {
  const players = req.body.players;  // 修正此处的解构

  if (!players || !Array.isArray(players)) {
    return res.status(400).json({ message: 'Invalid or missing players data.' });
  }

  // 处理每个玩家的选择
  players.forEach((player) => {
    const { name, choice } = player;
    if (!name || !choice) {
      return res.status(400).json({ message: 'Both player name and choice are required.' });
    }
    playerChoices[name] = choice;
  });
  res.json({ message: 'Choices received from players.' });
});


// 计算剪刀石头布结果的API
app.get('/api/rockPaperScissors/result', (req, res) => {
  const playerNames = Object.keys(playerChoices);

  if (playerNames.length < 2) {
    return res.status(400).json({ message: 'Need at least two players for the game.' });
  }

  let result = "It's a tie!";
  const winningRules: {
    [choice: string]: string;
  } = {
    rock: 'scissors',
    scissors: 'paper',
    paper: 'rock',
  };

  const results: { [name: string]: string } = {};

  for (let i = 0; i < playerNames.length; i++) {
    results[playerNames[i]] = 'draw';
    for (let j = 0; j < playerNames.length; j++) {
      if (i !== j) {
        const player1Choice = playerChoices[playerNames[i]];
        const player2Choice = playerChoices[playerNames[j]];
        if (player1Choice === player2Choice) {
          results[playerNames[i]] = 'draw';
        } else if (winningRules[player1Choice] === player2Choice) {
          if (results[playerNames[i]] !== 'draw') {
            results[playerNames[i]] = 'draw';
          } else {
            results[playerNames[i]] = playerNames[j];
          }
        }
      }
    }
  }

  res.json({ results });
});



// 儲存抽籤名字的api 
app.post('/api/submit-name-for-lottery', express.json(), (req, res) => {
  const name = req.body.name;
  if (!name) {
    return res.status(400).json({ message: 'Name is required.' });
  }
  namesForDraw.push(name);
  res.json({ message: 'Name submitted for the lottery.' });
});



// 查詢抽籤名單的api
app.get('/api/get-lottery-list', (req, res) => {
  res.json({ names: namesForDraw });
});



// 抽籤的api + 結果
app.get('/api/draw-lottery', (req, res) => {
  if (namesForDraw.length === 0) {
    return res.status(400).json({ message: 'No names to draw from.' });
  }
  const randomIndex = Math.floor(Math.random() * namesForDraw.length);
  const winner = namesForDraw[randomIndex];
  namesForDraw.splice(randomIndex, 1);
  res.json({ winner });
});


// 結束投票 計算總數
app.get('/api/end-vote', (req, res) => {
  const agreeOrDisagreeResults = calculateVotesByType(voteResults, ['agree', 'disagree']);
  const rockPaperScissorsResults = calculateVotesByType(voteResults, ['rock', 'paper', 'scissors']);
  const response = {
    total: {
      agreeOrDisagree: agreeOrDisagreeResults,
      rockPaperScissors: rockPaperScissorsResults
    }
  };
  res.json(response);
});

function calculateVotesByType(results: { [key: string]: { [key: string]: number } }, types: string[]) {
  const typeResults: { [key: string]: number } = {};
  for (const key of Object.keys(results)) {
    for (const type of types) {
      typeResults[type] = (typeResults[type] || 0) + (results[key][type] || 0);
    }
  }
  return typeResults;
}

