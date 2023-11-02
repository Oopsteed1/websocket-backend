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

  // 根据投票类型执行不同的逻辑
  if (voteType === 'agreeOrDisagree') {
    for (const key of Object.keys(voteResults)) {
      for (const choice of Object.keys(voteResults[key])) {
        voteResults[key][choice] = 0;
      }
    }
    res.json({ message: 'Voting started for AgreeOrDisagree.' });
  } else if (voteType === 'rockPaperScissors') {
    res.json({ message: 'Voting started for RockPaperScissors.' });
  } else if (voteType === 'lottery') {
    res.json({ message: 'Voting started for Lottery.' });
  } else {
    res.status(400).json({ message: 'Invalid vote type.' });
  }
});


// 贊成反對+剪刀石頭布的API (有總數的那種)
app.post('/api/submit-vote', express.json(), (req, res) => {
  const name = req.body.name;
  const choice = req.body.choice; // 从请求体中获取用户的选择

  // 检查是否已经投过票
  if (votedNames[name]) {
    res.status(400).json({ message: 'You have already voted.' });
    return;
  }

  // 处理投票逻辑
  if (name in voteResults) {
    voteResults[name][choice]++;
  } else {
    voteResults[name] = { rock: 0, paper: 0, scissors: 0 };
    voteResults[name][choice] = 1;
  }

  // 标记名字为已经投票
  votedNames[name] = true;

  res.json({ message: 'Vote submitted.' });
});


app.get('/api/end-vote', (req, res) => {
  // 结束投票逻辑
  // 计算投票结果
  const totalVotes = calculateTotalVotes(voteResults);

  // 构建响应对象
  const response = {
    total: totalVotes,
  };

  res.json(response);
});


function calculateTotalVotes(results: { [key: string]: { [key: string]: number | {} } }): { agree: number, disagree: number, rock: number, paper: number, scissors: number } {
  const total = { agree: 0, disagree: 0, rock: 0, paper: 0, scissors: 0 };

  for (const key of Object.keys(results)) {
    for (const choice of Object.keys(results[key])) {
      if (typeof results[key][choice] === 'number') {
        if (choice === 'agree') {
          total.agree += results[key][choice] as number;
        } else if (choice === 'disagree') {
          total.disagree += results[key][choice] as number;
        } else if (choice === 'rock') {
          total.rock += results[key][choice] as number;
        } else if (choice === 'paper') {
          total.paper += results[key][choice] as number;
        } else if (choice === 'scissors') {
          total.scissors += results[key][choice] as number;
        }
      }
    }
  }

  return total;
}
