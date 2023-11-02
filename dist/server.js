"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ws_1 = __importDefault(require("ws"));
const app = (0, express_1.default)();
const server = app.listen(3000, () => {
    console.log('Server started on localhost:3000');
});
const wsServer = new ws_1.default.Server({ server });
wsServer.on('connection', (socket) => {
    socket.send('Hello from server!');
    socket.on('message', (message) => {
        console.log(`Received message: ${message}`);
    });
});
// 添加一個路由處理程序，用於處理根路徑的GET請求
app.get('/', (req, res) => {
    res.send('Welcome to the WebSocket Server12123312!');
});
