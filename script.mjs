import express from 'express'
import HTTP_CODES from './utils/httpCodes.mjs';

const server = express();
const port = (process.env.PORT || 8000);

server.set('port', port);
server.use(express.static('public'));

function getRoot(req, res, next) {
    res.status(HTTP_CODES.SUCCESS.OK).send('Hello World').end();
}

server.get("/", getRoot);

server.listen(server.get('port'), function () {
    console.log('server running', server.get('port'));
});