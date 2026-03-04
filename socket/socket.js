var jwt = require('jsonwebtoken');
const {
    createUserConnection,
    updateUserConnection,
    getUserConnectionByUserId,
    getPoolByID,
    getPoolByEventId
} = require('../services/pool.service');

module.exports = function (scheme) {

    const io = require('socket.io')(scheme, {
        cors: {
            origin: "*"
        }
    });


    io.use((socket, next) => {
        let token = socket.handshake.query.token;
        jwt.verify(token, process.env.SECRET, (err, decoded) => {
            if (err) {
                console.log(err);
                return next(new Error('authentication error'));
            }

            socket.decodedtoken = decoded;
            return next();
        });
    });


    io.of('/chat').on('connection', function (socket, next) {
        console.log('a user connected');
        console.log(socket.id);

        jwt.verify(socket.handshake.query.token, process.env.SECRET, async (err, decoded) => {
            try {

                if (err) {
                    console.log(err);
                    return;
                }

                let currentUser = decoded;

                const doConnectionExists = await getUserConnectionByUserId(currentUser.id);

                if (!doConnectionExists) {

                    await createUserConnection({
                        userId: currentUser.id,
                        connectionId: socket.id,
                        isActive: true
                    })

                } else {

                    await updateUserConnection({
                        connectionId: socket.id,
                        isActive: true
                    }, { userId: currentUser.id })

                }

                console.log('user is online');

                socket.broadcast.emit('onlineUser', currentUser.id);

                socket.on('disconnect', async function (data) {
                    try {

                        const doConnectionExists = await getUserConnectionByUserId(currentUser.id);

                        if (doConnectionExists) {

                            await updateUserConnection({
                                connectionId: null,
                                isActive: false
                            }, { userId: currentUser.id })

                        }

                        socket.broadcast.emit('disconnectedUser', currentUser.id);

                        console.log('user is offline');
                        console.log('user disconnected');

                        socket.emit('disconnected');
                    }
                    catch (err) {
                        console.log(err)
                    }
                });

                socket.on('message', async function (msg) {
                    try {

                        console.log('newMessage');

                        socket.to(msg.roomId).emit('newMessage', msg);

                        socket.emit(msg.roomId, msg);

                        const type = msg.roomId.split('_')[1];

                        const typeId = msg.roomId.split('_')[0];

                        let members = [];

                        if (type === 'POOL') {

                            const pool = await getPoolByID(typeId);

                            members = pool.PoolsMembers.map(x => x.memberID);

                        } else {

                            const pools = await getPoolByEventId(typeId);

                            for (pool of pools) {

                                members = pool.PoolsMembers.map(x => x.memberID);
                            }
                        }

                        for (let member of members) {

                            const conversationConnection = await getUserConnectionByUserId(member);

                            if (conversationConnection) {

                                socket.to(conversationConnection.connectionId).emit('notify', msg);
                            }
                        }
                    }
                    catch (err) {
                        console.log(err)
                    }
                });

                socket.on('join', async function (connectionId) {
                    try {

                        console.log('joined room ' + connectionId);
                        socket.join(connectionId);
                    }
                    catch (err) {
                        console.log(err)
                    }
                });

            }
            catch (err) {
                console.log(err)
            }
        });
    });

};