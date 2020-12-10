const redis = require("redis");
const { promisify } = require("util");

function myDB() {
  const myDB = {};

  // We have only one connection per server
  const client = redis.createClient();

  client.on("error", function (error) {
    // TODO: HANDLE ERRORS
    console.error(error);
  });

  myDB.getSongs = async function (page) {
    const pzrange = promisify(client.zrange).bind(client);
    const phgetall = promisify(client.hgetall).bind(client);

    const ids = await pzrange("songs", 0, -1);

    console.log("Got songs ids", ids);

    // Iterate over the ids to get the details
    const promises = [];
    for (let id of ids) {
      promises.push(phgetall("song:" + id));
    }

    const songs = await Promise.all(promises);
    console.log("Songs details", songs);

    return songs;
  };

  myDB.createSong = async function (song) {
    // Convert the callback-based client.incr into a promise
    const pincr = promisify(client.incr).bind(client);
    const phmset = promisify(client.hmset).bind(client);
    const pzadd = promisify(client.zadd).bind(client);

    song.id = await pincr("countSongId");
    await phmset("song:" + song.id, song);
    return pzadd("songs", +new Date(), song.id);
  };

  myDB.updateSong = async function (song) {
    const phmset = promisify(client.hmset).bind(client);

    return phmset("song:" + song.id, song);
  };

  myDB.deleteSong = async function (song) {
    const pdel = promisify(client.del).bind(client);
    const pzrem = promisify(client.zrem).bind(client);

    await pdel("song:" + song.id);
    return await pzrem("songs", song.id);
  };

  return myDB;
}

module.exports = myDB();
