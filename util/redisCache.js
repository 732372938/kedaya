function Cache() {
}

try {
    var redis = require("redis");
    var cli = process.communal.redisCli
    var c = {
        port: cli.port,
        host: cli.host,
        options: {
            timeout: cli.timeout || 3000,
            password: cli.password || null
        }
    }
} catch (e) {
    var config = require("../config/config");
    var c = config.redis
}
try {
    let client = redis.createClient(c.port, c.host, c.options);
    client.on("error", function(err) {
        console.log(err);
    });
    let text = async (key) => {
        let doc = await new Promise((resolve) => {
            client.get(key, function(err, res) {
                return resolve(res);
            });
        });
        return JSON.parse(doc);
    };
    Cache.set = function(key, value) {
        value = JSON.stringify(value);
        return client.set(key, value, function(err) {
            if (err) {
                console.error(err);
            }
        });
    };
    Cache.get = async (key) => {
        return await text(key);
    };
    Cache.expire = function(key, time) {
        return client.expire(key, time);
    };
    Cache.close = async function() {
        return client.quit();
    }
} catch (e) {
}
module.exports = Cache;