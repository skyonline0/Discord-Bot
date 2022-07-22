const config = require('./config.json');
const Discord = require('discord.js')
const sql = require('mssql')
const client = global.client = new Discord.Client();
const prefix = '!';
const fs = require ('fs');
const ytdl = require('ytdl-core');
const DisTube = require("distube")
const { readdirSync } = require('fs');
const { join } = require('path')
const enmap = require("enmap");
const { MessageEmbed } = require('discord.js');
const { Console } = require('console');
const { channel } = require('diagnostics_channel');
var userTickets = new Map();
client.config = require("./config.json")
client.commands = new Discord.Collection();
client.distube = new DisTube(client, { searchSongs: true, emitNewSongOnly: true, leaveOnFinish: true })
client.commands = new Discord.Collection()
client.aliases = new Discord.Collection()
const queue = new Map();
var servers  = {};
let sqlConnection = null


//Status BOT
client.on('ready', () => {
    client.user.setActivity('', { type: 'PLAYING' }, {url: ''});

    console.log("Servers:")
    client.guilds.cache.forEach((guild) => {
        console.log(" - " + guild.name)
    })




    const emojiChannelID = '904291792541847585';

    client.on('message', async message => {
        if (message.channel.id === emojiChannelID) {
          try {
            await message.react('✅');
            await message.react('❌');
          } catch(err) {
            console.error(err);
          }
        }
      });


//Commands Kick / BAN
    const commandFiles = fs.readdirSync('./moderation/').filter(file => file.endsWith('.js'));
	for(const file of commandFiles){
	const command = require(`./moderation/${file}`);
	client.commands.set(command.name, command);
    }

	client.on('message', message => {
    if(message.channel.type === "dm") return;
	if (!message.content.startsWith(prefix) || message.author.bot) return;
	const args = message.content.slice(prefix.length).split(/ +/);
	const commands = args.shift().toLowerCase();

	if(commands === 'kick'){
	client.commands.get('kick').execute(client, message, args);
    }
	else if(commands === 'ban'){
	client.commands.get('ban').execute(client, message, args);
    }
    else if(commands === 'unban'){
    client.commands.get('unban').execute(client, message, args);
    }
    else if(commands === 'clear'){
    client.commands.get('clear').execute(message, args);
    }
    else if(commands === 'links'){
    client.commands.get('links').execute(message, args);
    }
    //In-Game Commands
    else if(commands === 'addsilk'){
    client.commands.get('addsilk').execute(message, args, Discord, sqlConnection);
    }
    else if(commands === 'addban'){
    client.commands.get('addban').execute(message, args, Discord, sqlConnection);
    }
    else if(commands === 'add-dc'){
    client.commands.get('add-dc').execute(message, args, Discord, sqlConnection);
    }
    else if(commands === 'addnotice'){
    client.commands.get('addnotice').execute(message, args, Discord, sqlConnection);
    }
    else if(commands === 'addgold'){
    client.commands.get('addgold').execute(message, args, Discord, sqlConnection);
    }
    else if(commands === 'additem'){
    client.commands.get('additem').execute(message, args, Discord, sqlConnection);
    }
    else if(commands === 'addtitle'){
    client.commands.get('addtitle').execute(message, args, Discord, sqlConnection);
    }
    else if(commands === 'avatar'){
    client.commands.get('avatar').execute(message, args, Discord);
    }
    else if(commands === 'duyur'){
    client.commands.get('duyur').execute(message, args, Discord, sqlConnection);
    }



   //Catch Error
    try {
        cmd.execute(message, args);
    } catch (e) {
        console.error(e)
       // message.reply(`Error: ${e}`)
    }
});

 //Welcome message
client.on('guildMemberAdd', async(member) =>{
    const channelID = '904291792973881422'
    const channel = member.guild.channels.cache.get(channelID);

      console.log(member);

      //send through channel
const WelcomeEmbed = new MessageEmbed()
.setColor('#0099ff')
.setAuthor(`Welcome Message`, 'https://i.imgur.com/DGIgLDO.gif')
.setTitle (`**Thank you for choosing & trusting Cripple Online! See you again!**`)
.setDescription(`**Welcome** ${member} **To The Cripple Online Discord Server**`)
.setThumbnail(member.user.displayAvatarURL({dynamic: true, size: 512}))
.setImage('https://i.imgur.com/i3JZxxL.png')
.setTimestamp()
.setFooter('Powered by www.play-crippleonline.com', 'https://i.imgur.com/DGIgLDO.gif');
  channel.send({ embed: WelcomeEmbed });
})




//Music Commands
fs.readdir("./commands/", (err, files) => {
    if (err) return console.log("Could not find any commands!")
    const jsFiles = files.filter(f => f.split(".").pop() === "js")
    if (jsFiles.length <= 0) return console.log("Could not find any commands!")
    jsFiles.forEach(file => {
        const cmd = require(`./commands/${file}`)
        console.log(`Loaded ${file}`)
        client.commands.set(cmd.name, cmd)
        if (cmd.aliases) cmd.aliases.forEach(alias => client.aliases.set(alias, cmd.name))
    })
})


client.on("message", async message => {
    const prefix = config.prefix
    if (!message.content.startsWith(prefix)) return
    const args = message.content.slice(prefix.length).trim().split(/ +/g)
    const command = args.shift().toLowerCase()
    const cmd = client.commands.get(command) || client.commands.get(client.aliases.get(command))
    if(message.channel.type === "dm") return;
    if (!cmd) return
    if (cmd.inVoiceChannel && !message.member.voice.channel) return message.channel.send(`You must be in a voice channel!`)


    try {
        cmd.run(client, message, args)
    } catch (e) {
        console.error(e)
      //  message.reply(`Error: ${e}`)
    }
})

const status = queue => `Volume: \`${queue.volume}%\` | Filter: \`${queue.filter || "Off"}\` | Loop: \`${queue.repeatMode ? queue.repeatMode === 2 ? "All Queue" : "This Song" : "Off"}\` | Autoplay: \`${queue.autoplay ? "Off" : "Off"}\``
client.distube
    .on("playSong", (message, queue, song) => message.channel.send(
        `Playing \`${song.name}\` - \`${song.formattedDuration}\`\nRequested by: ${song.user}\n${status(queue)}`
    ))
    .on("addSong", (message, queue, song) => message.channel.send(
        `Added ${song.name} - \`${song.formattedDuration}\` to the queue by ${song.user}`
    ))
    .on("playList", (message, queue, playlist, song) => message.channel.send(
        `Play \`${playlist.title}\` playlist (${playlist.total_items} songs).\nRequested by: ${song.user}\nNow playing \`${song.name}\` - \`${song.formattedDuration}\`\n${status(queue)}`
    ))
    .on("addList", (message, queue, playlist) => message.channel.send(
        `Added \`${playlist.title}\` playlist (${playlist.total_items} songs) to queue\n${status(queue)}`
    ))
    // DisTubeOptions.searchSongs = true
    .on("searchResult", (message, result) => {
        let i = 0
        message.channel.send(`**Choose an option from below**\n${result.map(song => `**${++i}**. ${song.name} - \`${song.formattedDuration}\``).join("\n")}\n*Enter anything else or wait 60 seconds to cancel*`)
    })




// SRO STUFFS
    console.log("-----------------------------------")

    mssqlConnect()
    cleanChannelData()

    let guild = client.guilds.cache.find(guild => guild.name == config.server)
    if (guild)
    {
        guild.channels.cache.forEach((channel) => {
            insertChannel(channel.name, channel.id)
        })
    }

    if (config.enableRoleAssign)
    {
        console.log("its enabled")
    }

    startHandler()
})

client.on('message', (receivedMessage) => {
    if (receivedMessage.author == client.user) {
        return
    }

    if (receivedMessage.channel.type == "dm")
    {
        dmLog(receivedMessage.author.tag, receivedMessage.author.id, receivedMessage.content, receivedMessage.id)
        return
    }

    if (receivedMessage.guild.name == config.server)
    {
        if (receivedMessage.content.length > 0)
        {
            var channelId = new String(receivedMessage.channel).substr(2).replace(">", "");
            var content = new String(receivedMessage.content).replace("<@" + client.user.id + "> ", "")

            messageLog(receivedMessage.channel.name, channelId, receivedMessage.author.tag, receivedMessage.author.id, content, receivedMessage.id)

            if (receivedMessage.mentions.has(client.user))
                mentionLog(receivedMessage.channel.name, channelId, receivedMessage.author.tag, receivedMessage.author.id, content)
        }
    }
})

function deleteMessage(channelId, messageId)
{
    client.channels.cache.get(channelId).messages.fetch(messageId).then(message => {
        message.delete();
    })
}

function reactMessage(channelId, messageId, emojiId)
{
    client.channels.cache.get(channelId).messages.fetch(messageId).then(message => {
        message.react(emojiId);
    })
}

function sendDm(userId, message)
{
    client.users.cache.get(userId).send(message) .setFooter('Powered By www.play-crippleonline.com','https://i.imgur.com/DGIgLDO.gif') .setTimestamp()
}

function sendMessage(ChannelId, message)
{
    client.channels.cache.get(ChannelId).send(message) .setFooter('Powered By www.play-crippleonline.com','https://i.imgur.com/DGIgLDO.gif') .setTimestamp()
}

function sendAlchemy(ChannelId, CharName, message, Icon)
{
    client.channels.cache.get(ChannelId).send(new Discord.MessageEmbed() .setColor("ORANGE") .setAuthor('Notification Alchemy') .setTitle(CharName) .setDescription(message) .setThumbnail(Icon) .setFooter('Powered By www.play-crippleonline.com','https://i.imgur.com/DGIgLDO.gif') .setTimestamp())
}

function sendNotice(ChannelId, EventName, message)
{

    client.channels.cache.get(ChannelId).send(new Discord.MessageEmbed() .setColor("ORANGE") .setAuthor('Events') .setTitle(EventName) .setDescription(message) .setFooter('Powered By www.play-crippleonline.com','https://i.imgur.com/DGIgLDO.gif') .setTimestamp())
}

function sendSpawnNotice(ChannelId, message)
{

    client.channels.cache.get(ChannelId).send(new Discord.MessageEmbed() .setColor("ORANGE")  .setAuthor(message) .setFooter('Powered By www.play-crippleonline.com','https://i.imgur.com/DGIgLDO.gif') .setTimestamp())
}

function sendKillNotice(ChannelId, CharName, message, Icon )
{
    client.channels.cache.get(ChannelId).send(new Discord.MessageEmbed() .setColor("ORANGE") .setAuthor(CharName) .setDescription(message) .setThumbnail(Icon) .setFooter('Powered By www.play-crippleonline.com','https://i.imgur.com/DGIgLDO.gif') .setTimestamp())
}

function sendGlobal(ChannelId, CharName, message, Icon)
{

    client.channels.cache.get(ChannelId).send(new Discord.MessageEmbed() .setColor("ORANGE") .setAuthor('Notification Global') .setTitle(CharName) .setDescription(message).setThumbnail(Icon) .setFooter('Powered By www.play-crippleonline.com','https://i.imgur.com/DGIgLDO.gif') .setTimestamp())
}

function sendCharData(ChannelId, CharName, Charlvl, GuildName, CharIcon, IconStatus, RegionName)
{
	const emoji = client.emojis.cache.first(IconStatus);
    client.channels.cache.get(ChannelId).send(new Discord.MessageEmbed() .setFooter('Powered By www.play-crippleonline.com','https://i.imgur.com/DGIgLDO.gif') .setTimestamp()

	.setColor("RANDOM") .setAuthor(CharName) .setThumbnail(CharIcon)
	.addFields({ name: 'Status', value: IconStatus, inline: true },{ name: 'Level', value: Charlvl, inline: true },{ name: 'GuildName', value: GuildName, inline: true },{ name: 'Region', value: RegionName, inline: false }))
}

function sendSilkCommand(ChannelId, CharName, SilkAmount)
{

    client.channels.cache.get(ChannelId).send(new Discord.MessageEmbed() .setFooter('Powered By www.play-crippleonline.com','https://i.imgur.com/DGIgLDO.gif') .setTimestamp()

	.setColor("RANDOM") .setAuthor(CharName)
	.addFields({ name: 'Charname', value: CharName, inline: true },{ name: 'Silk Amount', value: SilkAmount, inline: true}))
}




function AddRole(userId)
{
	const role = member.guild.roles.cache.find(role => role.name === 'Role');
	const members = message.mentions.members.first(userId);
	members.roles.add(role);
}
function cleanChannelData()
{
    sqlConnection.then(pool => {
        return pool.query`TRUNCATE TABLE _ChannelData`
    }).catch(err => {
    })
}

function insertChannel(name, channelId)
{
    sqlConnection.then(pool => {
        return pool.query`INSERT INTO _ChannelData VALUES(${name}, ${channelId})`
    }).catch(err => {
    })
}

function mssqlConnect()
{
    try
    {
        sqlConnection = new sql.ConnectionPool(config.sqlConfig).connect()
        console.log("mssql: connected!")
    }
    catch (err)
    {

    }
}

function startHandler()
{
    setInterval(function() {
        refreshHandler();
    }, config.handlerInterval);

    console.log("feature: Request Handler has started!")
}

function refreshHandler()
{
    sqlConnection.then(pool => {
        return pool.query`SELECT TOP 1 RequestId, ChannelId, ContentType, Content FROM _RequestHandler WHERE Complete = 0 ORDER BY EventTime ASC`
    }).then(result => {
		if (result.recordset[0] == null) {
			return;
		}
        updateHandler(result.recordset[0].RequestId)
        if (result.recordset[0].ContentType == 1)
        {
            sendMessage(result.recordset[0].ChannelId, result.recordset[0].Content)
        }
        else if (result.recordset[0].ContentType == 2)
        {
            var idArr = result.recordset[0].Content.split(';')
            reactMessage(result.recordset[0].ChannelId, idArr[0], idArr[1])
        }
        else if (result.recordset[0].ContentType == 3)
        {
            deleteMessage(result.recordset[0].ChannelId, result.recordset[0].Content)
        }
        else if (result.recordset[0].ContentType == 4)
        {
			var idArr = result.recordset[0].Content.split(';')
            sendDm(idArr[0], idArr[1])
        }
		else if (result.recordset[0].ContentType == 5)
        {
			var idArr = result.recordset[0].Content.split(';')
            AddRole(idArr[0])
        }
		else if (result.recordset[0].ContentType == 6)
        {
			var idArr = result.recordset[0].Content.split(';')
            sendAlchemy(result.recordset[0].ChannelId, idArr[0], idArr[1], idArr[2])
        }
		else if (result.recordset[0].ContentType == 7)
        {
			var idArr = result.recordset[0].Content.split(';')
            sendNotice(result.recordset[0].ChannelId, idArr[0], idArr[1])
        }
		else if (result.recordset[0].ContentType == 8)
        {
            var idArr = result.recordset[0].Content.split(';')
            sendCharData(result.recordset[0].ChannelId, idArr[0], idArr[1], idArr[2], idArr[3], idArr[4], idArr[5])
        }
		else if (result.recordset[0].ContentType == 9)
        {
			var idArr = result.recordset[0].Content.split(';')
            sendGlobal(result.recordset[0].ChannelId, idArr[0], idArr[1], idArr[2])
        }
		else if (result.recordset[0].ContentType == 10)
        {
		sendSpawnNotice(result.recordset[0].ChannelId, result.recordset[0].Content)
        }
		else if (result.recordset[0].ContentType == 11)
        {
			var idArr = result.recordset[0].Content.split(';')
            sendKillNotice(result.recordset[0].ChannelId, idArr[0], idArr[1], idArr[2])
        }

        else if (result.recordset[0].ContentType == 12)
        {
            var idArr = result.recordset[0].Content.split(';')
            sendSilkCommand(result.recordset[0].ChannelId, idArr[0], idArr[1])
        }

    }).catch(err => {
		
    })
}

function updateHandler(RequestId)
{
    sqlConnection.then(pool => {
        return pool.query`UPDATE _RequestHandler SET Complete = 1 WHERE RequestId = ${RequestId}`
    }).catch(err => {

    })
}

function mentionLog(channelName, channelId, user, userId, message)
{
    sqlConnection.then(pool => {
        return pool.query`EXEC _AddMentionLog ${channelName}, ${channelId}, ${user}, ${userId}, ${message}`
    }).catch(err => {

    })
}

function messageLog(channelName, channelId, user, userId, message, messageId)
{
    sqlConnection.then(pool => {
        return pool.query`EXEC _AddMessageLog ${channelName}, ${channelId}, ${user}, ${userId}, ${message}, ${messageId}`
    }).catch(err => {

    })
}

function dmLog(user, userId, message, messageId)
{
    sqlConnection.then(pool => {
        return pool.query`EXEC _AddDMLog ${user}, ${userId}, ${message}, ${messageId}`
    }).catch(err => {

    })
}





client.login(config.token)
