import WebSocket from 'ws';
import express from 'express';

const cors = require('cors');
const app = express();
const votedNames: { [key: string]: boolean } = {};
let voteResults: { [key: string]: { [key: string]: number } } = {};
let namesForDraw: string[] = [];
let playerChoices: { name: string, choice: string }[] = [];
let currentVoteTopic: string | null = null;

app.use(cors());
const server = app.listen(3000, () => {
  console.log('WebSocket server is running on port 3000');
});
const wss = new WebSocket.Server({ server });

wss.on('connection', ws => {
  console.log('[Client connected]')
  // Connection closed
  ws.on('close', () => {
      console.log('Close connected')
  })
})

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
    res.json({ message: `投票主題 : ${topic}` });
  } else if (voteType === 'rockPaperScissors') {
    currentVoteTopic = topic;
    res.json({ message: `投票主題 : ${topic}` });
  } else if (voteType === 'lottery') {
    currentVoteTopic = topic;
    res.json({ message: `投票主題 : ${topic}` });
  } else {
    res.status(400).json({ message: '無效的投票方式' });
  }
});

// --------------------------------贊成反對API 開始---------------------------- //
// 贊成反對的API (有總數的那種)
app.post('/api/submit-vote', express.json(), (req, res) => {
  const name = req.body.name;
  const choice = req.body.choice;
  if (choice !== 'agree' && choice !== 'disagree') {
    return res.status(400).json({ message: 'Invalid choice. Must be "agree" or "disagree".' });
  }
  if (votedNames[name]) {
    return res.status(400).json({ message: 'You have already voted.' });
  }
  if (name in voteResults) {
    voteResults[name][choice]++;
  } else {
    voteResults[name] = { agree: 0, disagree: 0 };
    voteResults[name][choice] = 1;
  }
  votedNames[name] = true;
  res.json({ message: 'Vote submitted.' });
});

// 結束贊成反對 計算總數 且給結果
app.get('/api/end-vote', (req, res) => {
  const agreeOrDisagreeResults = calculateVotesByType(voteResults, ['agree', 'disagree']);
  const agreeCount = agreeOrDisagreeResults['agree'];
  const disagreeCount = agreeOrDisagreeResults['disagree'];
  let winner = 'draw';
  if (agreeCount > disagreeCount) {
    winner = 'agree';
  } else if (disagreeCount > agreeCount) {
    winner = 'disagree';
  }
  const voteResponse = {
    total: {
      results: {
        agree: agreeCount,
        disagree: disagreeCount
      },
    },
    winner: winner
  };
  res.json(voteResponse);
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

// 重製贊成反對的API
app.post('/api/reset-vote', (req, res) => {
  for (const key of Object.keys(voteResults)) {
    voteResults[key]['agree'] = 0;
    voteResults[key]['disagree'] = 0;
  }
  res.json({ message: 'choices have been reset.' });
});
// --------------------------------贊成反對API 結束---------------------------- //



// --------------------------------剪刀石頭布API 開始-------------------------- //

// 儲存玩家选择的API
app.post('/api/rockPaperScissors', express.json(), (req, res) => {
  const players = req.body.players;
  if (!players || !Array.isArray(players) || players.length !== 1) {
    return res.status(400).json({ message: 'Exactly one player at a time can make a choice.' });
  }
  const player = players[0];
  const { name, choice } = player;
  if (!name || !choice) {
    return res.status(400).json({ message: 'Both player name and choice are required.' });
  }
  if (playerChoices.length >= 2) {
    return res.status(400).json({ message: 'Cannot store more than two players.' });
  }
  if (playerChoices.some(existingPlayer => existingPlayer.name === name)) {
    return res.status(400).json({ message: 'Player name already exists in the list.' });
  }
  playerChoices.push(player);
  res.json({ message: 'Choice received from the player.' });
});


// 查詢剪刀石頭布的名單API
app.get('/api/rockPaperScissors/getPlayers', (req, res) => {
  // 在这里返回名单数据
  res.json({ players: playerChoices });
});


// 获取剪刀石头布比较结果的API
app.get('/api/rockPaperScissors/result', (req, res) => {
  if (playerChoices.length !== 2) {
    return res.status(400).json({ message: 'Need exactly two players for comparison.' });
  }

  const player1Choice = playerChoices[0].choice;
  const player2Choice = playerChoices[1].choice;
  let finalResult = '平手';

  if (player1Choice === player2Choice) {
    finalResult = '平手';
  } else if (player1Choice === 'rock' && player2Choice === 'scissors') {
    finalResult = `贏家: ${playerChoices[0].name}`;
  } else if (player1Choice === 'rock' && player2Choice === 'paper') {
    finalResult = `贏家: ${playerChoices[1].name}`;
  } else if (player1Choice === 'scissors' && player2Choice === 'paper') {
    finalResult = `贏家: ${playerChoices[0].name}`;
  } else if (player1Choice === 'scissors' && player2Choice === 'rock') {
    finalResult = `贏家: ${playerChoices[1].name}`;
  } else if (player1Choice === 'paper' && player2Choice === 'rock') {
    finalResult = `贏家: ${playerChoices[0].name}`;
  } else if (player1Choice === 'paper' && player2Choice === 'scissors') {
    finalResult = `贏家: ${playerChoices[1].name}`;
  }
  res.json({ finalResult });
});

// 清除玩家选择的API
app.post('/api/rockPaperScissors/reset', (req, res) => {
  playerChoices = [];
  res.json({ message: 'Player choices have been reset.' });
});
// --------------------------------剪刀石頭布API 結束-------------------------- //



// --------------------------------抽籤API 開始------------------------------- //

// 儲存抽籤名字的api
app.post('/api/submit-name-for-lottery', express.json(), (req, res) => {
  const name = req.body.name;
  if (!name) {
    return res.status(400).json({ message: 'Name is required.' });
  }
  if (namesForDraw.includes(name)) {
    return res.status(400).json({ message: 'Name already exists in the lottery.' });
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

// 重置抽奖名单的API
app.post('/api/reset-lottery-list', (req, res) => {
  namesForDraw = [];
  res.json({ message: 'Lottery list has been reset.' });
});

// --------------------------------抽籤API 結束------------------------------- //