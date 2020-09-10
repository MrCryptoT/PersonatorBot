//Grab the legit Mod/Admin Users and protect them from Impersonation
//If someone feels generous, some Coffee donations are never needed, but always appreciated <3 BTC: 1C1zWwmV44vrt4fWxnqa1FPm93kGuFQ6XL

//Approach: 
//Scan for similar Usernames as in specified Roles and if found kick or Ban (depending on Config) 
//this should be used carefully though as short usernames may match quite quickly (anything under 6 chars is probably overkill)

//Also if the discriminator does not match we may only want to warn instead of banning/kicking

//Server Setup
var RolestoCheck = ['Moderators', 'Admins', 'Trusted Trader']; //Names of Roles to protect, needs to be exact match
var Servertocheck = "454523192657051668"; //Server ID to protect
var ChannelIDtorespondin = ["740588315501133943"]; //ignore commands in all other channels - leave EMPTY [] to allow all channels!
var missingrightsnotifytags = "<@&455177482581180428>"; //GroupID to Tag if a user with missing rights calls a ban - if enabled make sure thebot is allowed to use the entered tag
//use <@id> to tag a User instead of a Role for missingrightsnotifytags
var staysilentonwrongchannelusedforcommand = true; //if set to true Bot will completely ignore commands in non bot channels (supply all channel ID's the bot is allowed to talk in in it's var)
var wrongchanneldescriptionforcommand = "Please use the #scam-alert Channel next time to report scammers, We'll take a look when we can.";	
var punishaction = "ban" // "kick" or "ban" 
var minnamelengthtoprotect = 6; //checks will be ignored if username shorter than this (without discriminator)
var includediscriminator = true; //disallow the same name even if discriminator is not the same - if true MrT#1234 and MrT#4321 can both be on the Server even if 1 of them is protected
var Loglevel = "debug"; //error: 0,  warn: 1,  info: 2,  http: 3,  verbose: 4,  debug: 5,  silly: 6 - always displays selected level and lower

//	Commands	
var commandprefix = "!"; //Mostly for debugging as scanning takes places when users join or rename
var commandnametoban = "ban"; //banning via userid (calling user still needs proper rights)
var helpargument = ["help", "info"];

//	Elaborate Setup
var mee6inteagration_cmdclear_enabled = false;

var banacceptedreaction = ["✅"];
var deleteafterreaction = true;
var Deletereportcommandswhenbanned = true;

var Reportemoji = "🚨";
var Reportonemojireaction = true;

var warnforpotentialmatch = true; //Warn for potential matchess where name is same but discriminator is different
var tagagrouponmissingrights = true;

//	copy paste protection area
var knownscamcopypastecontents = ["Facebooks Libra coin just got released! Heres the Tweet", "indicator from tradest.io", "\nwww.tradest.io\n"] //implement this later for the usual "hey libra released" spam
var copypastespamprotectionenabled = true;
var OCREnabled = true;
var OCRonlydebug = true;

//req's
var Discord = require('discord.io'); //Discord API Library - not too current but works
var winston = require('winston'); //Logger Lib
var auth = require('./auth.json'); //Discord Bot Token
const {
    createWorker,
    PSM,
    createScheduler
} = require('C:\\_Custom\\PersonatorBot\\node_modules\\tesseract.js\\src');

//Init Vars for use later
var Memberstoprotect = [];
var Membersnamestoprotect = [];
var AllUsers;
var AllUsersCache = [];
var msgidauthorarray = [];
var usergotjustreported = false;
var reportisactive = false;
var reporteduserIDviaemoji
var reporteduserIDviaemojibyuserid
var lastreportmsgid
var anwsermsgid
var banproposals = [] //List of all proposal ID's
var lastguildMemberUpdateusername = ""
var cachesareuptodate = true; 
var eventisbeeingprocessed = false; 
const {
    combine,
    timestamp,
    label,
    printf
} = winston.format;
const myFormat = printf(({
    level,
    message,
    label,
    timestamp
}) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
});

const logger = winston.createLogger({
    level: 'debug',
    format: combine(
        label({
            label: process.env.COMPUTERNAME
        }),
        timestamp(),
        myFormat
    ),
    //  format: winston.format.combine(
    //    winston.format.timestamp(),
    //    winston.format.json()
    //   ),
    //  defaultMeta: { service: 'Personator Bot' },
    transports: [
        new winston.transports.File({
            filename: 'error.log',
            level: 'error',
			maxsize: 10000000
        }),
        new winston.transports.File({
            filename: 'Log.log',
			maxsize: 10000000
        }),
        new winston.transports.File({
            filename: 'Debug.log',
            level: 'silly',
			maxsize: 100000000
        }),
        new winston.transports.Console({
            level: 'info',
            'timestamp': true,
            colorize: true
        }),
    ],
});

// Initialize Discord Bot
var bot = new Discord.Client({
    token: auth.token,
    autorun: true
});

bot.on('ready', function(evt) {
    logger.info('Connected, Bot ready');
    logger.debug('Logged in as: ' + bot.username + ' - (' + bot.id + ')');
    bot.getAllUsers();
    var input = {
        limit: 99999,
    }
    bot.getMembers(input);
    //Build Arrays with protecteduser info, called all 10 minutes (will need top include some type of "running" indicator to prevent other code from running until rebuild finished)
    Getalluserdataandbuildarrays()
    setInterval(() => Getalluserdataandbuildarrays(), 100000);
    //run a first check after startup to check for impersonators if feature is enabled 
    setTimeout(() => runcheck(), 2500);

});

//Event to fire if bots Disconencts (fix for stopping bot after certain amount of hours)
bot.on('disconnect', (msg, code) => {
    if (code === 0) return console.error(msg);
    bot.connect();
});

//Event fire's on new users joining the "guild" (guild = Discord Server - damn discord's programmers are Gaming oriented)
bot.on('guildMemberAdd', function(member) {
	eventisbeeingprocessed = true;
    logger.info(member.id + 'ID joined!');
    logger.info(member.discriminator + 'name!');
    //Run a Check whenever a new user joins
    runcheck();
	eventisbeeingprocessed = false;
});

//Event fires on a name Change of a User already in our Guild
bot.on('guildMemberUpdate', function(oldMember, newMember) {
	eventisbeeingprocessed = true;
	if ((lastguildMemberUpdateusername ==  newMember)){
		lastguildMemberUpdateusername = newMember;
		logger.info('User renamed to: ' + newMember.username);
		//Run a Check whenever a user changes his name
		runcheck();	
	}
	eventisbeeingprocessed = false;
});

//Event fires on a reaction to some Message
bot.on('messageReactionAdd', function(messageReaction, User, event, message) {
	eventisbeeingprocessed = true;
	while(!(cachesareuptodate)){} //literally dead code to wait for data to be synced fully
    //Check if reacting user is a memeber of a protected Role
    userisprotected = isuserprotected(messageReaction.d.user_id)
    var reactingmessageid = messageReaction.d.message_id;
    var reactinguserid = messageReaction.d.user_id;
    var emoji = messageReaction.d.emoji
    var reactedinchannelid = messageReaction.d.channel_id
    logger.debug("reacting user is protected: " + userisprotected);

    if (emoji.name == Reportemoji) {
        logger.debug("Reportemoji detected");
        if (Reportonemojireaction) {
            //If user is protected, simply ban the user
            var msgauthorid
            for (var listentry in msgidauthorarray) {
				
				if (!(msgidauthorarray[listentry].author == bot.id) && !(isuserprotected(msgidauthorarray[listentry].author)) && (banproposals.includes(msgidauthorarray[listentry].author))){
                         sendembed_basic(reactedinchannelid, 3066993, "Already Reported", "We already got a Report for this User, please be patient!", Footertext);
				}
				
				
                //Only check if user is admin, and is not reporting a bot (And is not reporting a protected user) 
                if (userisprotected && !(msgidauthorarray[listentry].author == bot.id) && !(isuserprotected(msgidauthorarray[listentry].author)) && !(banproposals.includes(msgidauthorarray[listentry].author))) {
                    //Ban the user (basically an easier report command without typing)
                    logger.verbose("Entered reportemoji area - trying to figure out what to do")
                    if (messageReaction.d.message_id == msgidauthorarray[listentry].msgid) {
                        //find user for current message - search array 
                        logger.verbose("Found correspondig Listentry in msgidauthorarray, checking values")
						
                        msgauthorid = msgidauthorarray[listentry].author
                        reporteduserIDviaemoji = msgauthorid //will be grabed immendiatly after
                        var usertobanid = {
                            serverID: Servertocheck,
                            userID: msgauthorid,
                            reason: reactinguserid + " manually banned " + msgauthorid,
                            lastDays: 1
                        }
                        var title = "Thats a BANHAMMER!"
                        logger.verbose("trying to ban userid : " + msgidauthorarray[listentry].usertoban + " for" + usertobanid.reason);
                        bot.ban(usertobanid);
                        reactingmessageid
                        var embedtext = 'Alright, <@' + msgauthorid + '> has been manually banned by <@' + reactinguserid + ">"
                        sendembed_basic(reactedinchannelid, 3066993, title, embedtext, Footertext);
                        logger.verbose("Original Message ID to delete (report)" + msgidauthorarray[listentry].origmsgid)
						//remove the banproposal from the list if 1 exists (might not exist yet, but cleanup to make sure)
                        var indexof = banproposals.indexOf(usertoban)
                        //logger.info("index of banproposal " + indexof )
                       if (!(indexof == -1)){
						   banproposals.splice(indexof, 1)
					   } 
			   if (banproposals.length == 0) {
                    reportisactive = false;
                }
                    }
                } else {
                    //Report the user and keep and Entry of the Report if not reported already (no need for multiple info cars)
                    if (messageReaction.d.message_id == msgidauthorarray[listentry].msgid && !(msgidauthorarray[listentry].author == bot.id) && !(isuserprotected(msgidauthorarray[listentry].author)) && !(banproposals.includes(msgidauthorarray[listentry].author))) {

                        var usagestring = "`" + commandprefix + commandnametoban + " @usernametag reason for the ban \n" + commandprefix + commandnametoban + " 412331231244123413 reason for the ban`"
                        if (acceptanddenybans) {
                            usagestring += " \nYou can also react to this embed using a " + banacceptedreaction[0] + "-Emoji to accept, or a " + bandeniedreaction[0] + " to deny this report immediatly!"
                        }
                        msgauthorid = msgidauthorarray[listentry].author
                        reporteduserIDviaemoji = msgauthorid
                        var Footertext = "Thanks alot " + bot.users[reactinguserid].username + " for helping us in the fight against spammers and scammers! ❤️";
                        reportmsg = '***Thanks alot*** for trying to help **' + bot.users[reactinguserid].username + '**, We passed it on to our Mods!'
                        title = "Thanks for the Report!"
                        usergotjustreported = true;
                        lastreportmsgid = messageReaction.d.message_id
                        reporteduserIDviaemoji = msgauthorid
                        reporteduserIDviaemojibyuserid = reactinguserid
                        reportisactive = true;

                        if (tagagrouponmissingrights) {
                            reportmsg += "\nWe notified " + missingrightsnotifytags + " to take a look when possible."
                            setTimeout(() => sendembed_report(reactedinchannelid, 0x442691, title, reportmsg, Footertext, msgauthorid, usagestring, "his Message " + messageReaction.d.message_id), 666);


                            setTimeout(() => bot.sendMessage({
                                to: reactedinchannelid,
                                message: missingrightsnotifytags + " Have a look at this please, the reported ID is in the Info-Card"
                            }, (err, res) => {
                                anwsermsgid = (res.id);
                                //logger.info("anwserid: " + anwsermsgid)
                            }), 1111);
                        }
                        //set report entry via ID
                        //banproposals.push(messageReaction.d.message_id)
                    }
                }
            }
        }
    }
    logger.silly("Reacted in Channel ID : " + reactingmessageid + " due to Reaction: " + emoji.name);
    logger.info("Is there still an active Report? :" + reportisactive)
    if (banacceptedreaction.includes(emoji.name) && userisprotected && reportisactive) {
        var proposalid, usertoban, anwsermessageid, isbotmsg, lastreportedmsgid, reportingauthor
        for (var l in msgidauthorarray) {
            for (var le in msgidauthorarray) {
                if (msgidauthorarray[l].origmsgid == msgidauthorarray[le].msgid) {
                    origmsg = msgidauthorarray[le].origmsg;
                    origmsgauthor = msgidauthorarray[le].author;
                    isbotmsg = msgidauthorarray[le].botmsg;
                    lastreportedmsgid = msgidauthorarray[le].lastreportmsgid
                }
                if (msgidauthorarray[le].msgid == lastreportedmsgid) {
                    reportingauthor = msgidauthorarray[le].author;
                }
            }

            //make sure we only process the reacted to proposal, so figure out which proposal ID we are reacting to
            if (msgidauthorarray[l].msgid == reactingmessageid) {
                proposalid = msgidauthorarray[l].usertoban
                origmsgid = msgidauthorarray[l].origmsgid

                logger.silly("proposalid == origmsgauthor :" + proposalid + " " + origmsgauthor)
                logger.silly("accepted proposal ID through Emoji: " + proposalid + "\n with params origmsgauthor  :" + origmsgauthor)
                logger.silly("msgidauthorarray[l].botmsg =" + msgidauthorarray[l].botmsg)
                logger.silly("is bot message :" + isbotmsg)
                logger.silly("reportingauthor :" + reportingauthor)
                logger.silly("msgidauthorarray[l].anwsermsg :" + msgidauthorarray[l].anwsermsg)
                for (proposal in banproposals) {
                    logger.silly("Checking Proposal with ID: " + banproposals[proposal])
                    //Only process current proposal
                    if (proposalid == banproposals[proposal]) {
                        logger.silly("Found proposalID, processing " + banproposals[proposal])
                        //&& msgidauthorarray[listentry].msgid == reactingmessageid as part above 

                        logger.info("Proposal accepted event recognised - processing proposal :" + proposalid)
                        var usagestring = "`" + commandprefix + commandnametoban + " @usernametag reason for the ban \n" + commandprefix + commandnametoban + " 412331231244123413 reason for the ban`"
                        msgauthorid = msgidauthorarray[l].reportedby
                        var Footertext = "Thanks alot " + bot.users[msgauthorid].username + " for helping us in the fight against spammers and scammers! ❤️";
                        title = "Thats a BANHAMMER!"
                        logger.info("Banning user due to accepted report (by emoji)" + msgauthorid)

                        //Make sure the Origmsg contains text, if not replace it with empty string to replace it with "info or empty" info message
                        if (typeof origmsg == 'undefined') {
                            origmsg = ""
                        }
                        var banreasonstr
                        var args = origmsg.split(' ');
                        //Actually replace the text if there was none (pic uploads or embeds)
                        if (Array.prototype.slice.call(args, 2).join(" ") == "") {
                            banreasonstr = "no reason supplied or reported by Emoji"
                        } else {
                            banreasonstr = Array.prototype.slice.call(args, 2).join(" ").replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');;
                        }

                        var usertobanid = {
                            serverID: Servertocheck,
                            userID: msgidauthorarray[l].usertoban,
                            reason: bot.users[reactinguserid].username + " by accepting the banproposal of " + bot.users[msgauthorid].username + " to ban " + bot.users[msgidauthorarray[l].usertoban].username + " for : " + banreasonstr,
                            lastDays: 1
                        }
                        logger.verbose("trying to ban userid : " + msgidauthorarray[l].usertoban + " for" + usertobanid.reason);
                        bot.ban(usertobanid);
                        var embedtext = 'Alright, <@' + msgidauthorarray[l].usertoban + '> has been banned by ' + usertobanid.reason
                        sendembed_basic(reactedinchannelid, 3066993, title, embedtext, Footertext);

                        //Delete Admin Tag if setting is enabled
						if (tagagrouponmissingrights) {
                            var delparamsstrnotify = {
                                channelID: reactedinchannelid,
                                messageID: msgidauthorarray[l].anwsermsg
                            }
                            bot.deleteMessage(delparamsstrnotify);
                        }


                        if (deleteafterreaction) {
                            logger.verbose("Removing our embed message due to reaction of protected user: " + reactingmessageid);
                            var delparams = {
                                channelID: reactedinchannelid,
                                messageID: reactingmessageid
                            }
                            bot.deleteMessage(delparams);

                        }

                        //Delete orig report message for cleanup
                        if (deleteorigreportmessage) {
                            var delparams = {
                                channelID: reactedinchannelid,
                                messageID: msgidauthorarray[l].lastreportmsgid
                            }
                            logger.verbose("Original Message ID to delete (report)" + msgidauthorarray[l].lastreportmsgid)
                            bot.deleteMessage(delparams);
                        }
                        //remove the banproposal from the list, search msgid first, then for userID.
                        var indexof = banproposals.indexOf(banproposals[proposal])
                        if (indexof == -1) {
                            //Old code to check if the reportID is the embed msgID should never trigger
                            indexof = banproposals.indexOf(reactingmessageid)
                        }
                        //logger.info("index of banproposal " + indexof )
                        banproposals.splice(indexof, 1)
			   if (banproposals.length == 0) {
                    reportisactive = false;
                }
                    }
                }
                if (banproposals.length == 0) {
                    reportisactive = false;
                }
                logger.debug("Length of proposal array: " + banproposals.length)
                logger.debug("reportisactive " + reportisactive)
                if (!(reportisactive)) {
                    break
                }
            }

            //new list entry (next loop ciclye)
        }


    } else if (bandeniedreaction.includes(emoji.name) && userisprotected && reportisactive) {
        //Same as above, could be simplyfied in the same loop by checking the acept/deny reaction in there 
        //(And depending on that we can delete the messages and ban, or just delete the report messages)

        var proposalid, usertoban, anwsermessageid, isbotmsg, lastreportedmsgid, reportingauthor
        for (var l in msgidauthorarray) {
            for (var le in msgidauthorarray) {
                if (msgidauthorarray[l].origmsgid == msgidauthorarray[le].msgid) {
                    origmsg = msgidauthorarray[le].origmsg;
                    origmsgauthor = msgidauthorarray[le].author;
                    isbotmsg = msgidauthorarray[le].botmsg;
                    lastreportedmsgid = msgidauthorarray[le].lastreportmsgid
                }
                if (msgidauthorarray[le].msgid == lastreportedmsgid) {
                    reportingauthor = msgidauthorarray[le].author;
                }
            }

            //make sure we only process the reacted to proposal, so figure out which proposal ID we are reacting to
            if (msgidauthorarray[l].msgid == reactingmessageid) {
                proposalid = msgidauthorarray[l].usertoban
                origmsgid = msgidauthorarray[l].origmsgid

                logger.debug("proposalid == origmsgauthor :" + proposalid + " " + origmsgauthor)
                logger.debug("accepted proposal ID through Emoji: " + proposalid + "\n with params origmsgauthor  :" + origmsgauthor)
                logger.debug("msgidauthorarray[l].botmsg =" + msgidauthorarray[l].botmsg)
                logger.debug("is bot message :" + isbotmsg)
                logger.debug("reportingauthor :" + reportingauthor)

                for (proposal in banproposals) {
                    logger.silly("Checking Proposal with ID: " + banproposals[proposal])
                    //Only process current proposal
                    if (proposalid == banproposals[proposal]) {
                        logger.silly("Found proposalID, processing " + banproposals[proposal])
                        //&& msgidauthorarray[listentry].msgid == reactingmessageid as part above 
                        logger.debug("Proposal denied event recognised - processing proposal :" + proposalid)

                        //Delete Admin Tag if setting is enabled
                         if (tagagrouponmissingrights) {
                            var delparamsstrnotify = {
                                channelID: reactedinchannelid,
                                messageID: msgidauthorarray[l].anwsermsg
                            }
                            bot.deleteMessage(delparamsstrnotify);
                        }


                        if (deleteafterreaction) {
                            logger.verbose("Removing our embed message due to reaction of protected user: " + reactingmessageid);
                            var delparams = {
                                channelID: reactedinchannelid,
                                messageID: reactingmessageid
                            }
                            bot.deleteMessage(delparams);

                        }

                        //Delete orig report message for cleanup
                        if (deleteorigreportmessage) {
                            var delparams = {
                                channelID: reactedinchannelid,
                                messageID: msgidauthorarray[l].lastreportmsgid
                            }
                            logger.verbose("Original proposalid to delete (deny) " + proposalid)
                            bot.deleteMessage(delparams);
                        }
                        //remove the banproposal from the list, search msgid first, then for userID.
						//In this case we know one exists, as we are reacting to 1 
                        var indexof = banproposals.indexOf(banproposals[proposal])
                        banproposals.splice(indexof, 1)
			   if (banproposals.length == 0) {
                    reportisactive = false;
                }
                    }
                }
                if (banproposals.length == 0) {
                    reportisactive = false;
                }
                logger.debug("Length of proposal array: " + banproposals.length)
                logger.debug("reportisactive " + reportisactive)
                if (!(reportisactive)) {
                    //Try to break loop if not needed anymore, any optimzation is needed for a Server with 3K + Users
                    break
                }
            }

            //new list entry (next loop ciclye)
        }
    }
		eventisbeeingprocessed = false;
});

//Event that fires on new messages in the Server (Command)
bot.on('message', function(user, userID, channelID, message, event) {
	eventisbeeingprocessed = true;
	while(!(cachesareuptodate)){} //literally dead code to wait for data to be synced fully
    var author = {
        serverID: Servertocheck,
        userID: userID,
    }
    var member;
    setTimeout(() => member = bot.getMember(author), 1500);

    //set Footertext for embeds (thank u msg)
    var Footertext = "Thanks alot " + user + " for helping us in the fight against spammers and scammers! ❤️";
    //Now do message specific stuff
    //logger.debug("Roles of calling user:");

    //Check if messaging user is a memeber of a protected Role
    userisprotected = isuserprotected(userID); //we assume as protected users are allowed to ban for now - needs improvement.
    logger.debug("is user" + userID + " protected : " + userisprotected);
    if (copypastespamprotectionenabled) {
        //Check if msg contains spam, if so, we don't need to check attatchment (prenet race conditions with async) 
        if (!containsknownspam(message, userID, event.d.id, userisprotected)) {
            //No spam in default msg, check if there is an attatchment URL, if so OCR it
            logger.silly("attatchment undefined??");
            logger.silly(typeof event.d.attachments[0] == 'undefined');
            //event.d.attachments[i].url represents an attatchment, check if defined
            if ((typeof event.d.attachments[0] == 'undefined') == false && OCREnabled) {
                logger.debug("Trying to OCR");

                var picheight = 900
                var picwidth = 1080
                var headerheight = 150
                var heightdiff = picheight - headerheight
                logger.silly("Pic Dimensions: " + picheight + " by " + picwidth);

                //Start Async workers (Spam check handled in callback/checkforspam is triggered again after recognising)	
                const rectangletop = {
                    left: 0,
                    top: 0,
                    width: 777,
                    height: headerheight
                }
                const rectanglebottom = {
                    left: 0,
                    top: heightdiff,
                    width: picwidth,
                    height: headerheight
                }
                const rectangleall = {
                    left: 0,
                    top: 0,
                    width: picwidth,
                    height: picheight
                };
                (async () => {
                    //Async call for rectangletop
                    await getTextFromImage(event.d.attachments[0].url, userID, event.d.id, channelID, rectangletop, userisprotected);
                })();
                (async () => {
                    //Async call for rectangletop
                    await getTextFromImage(event.d.attachments[0].url, userID, event.d.id, channelID, rectanglebottom, userisprotected);
                })()
                //End of OCR Part - we triggered the worker so continue with other messageevent related code
            }
        }
    }

    //we are not in a Bot Channel, maybe inform if choosen to do so and if it's a command for us 
    if (message.substring(0, 1) == commandprefix && staysilentonwrongchannelusedforcommand == false && (ChannelIDtorespondin.length > 0 && (!ChannelIDtorespondin.includes(channelID)))) {
        logger.info("Informing User about wrong channel for Bot Interaction");
        sendembed_basic(channelID, 14177041, "Wrong Channel", wrongchanneldescriptionforcommand, Footertext);
    }

    //check if this is a command and if we are in bot channel
    if (message.substring(0, 1) == commandprefix && (ChannelIDtorespondin.includes(channelID) || ChannelIDtorespondin.length == 0)) {
        var argumentwasmsgidinstead = false
        logger.silly("entered command region - cmd recognised!");
        var args = message.substring(1).split(' ');
        var cmd = args[0];
        logger.silly("command:  " + cmd);
        //Mostly a Debuging function to test stuff - also helpfull for the planned known copy paste scam feature (catching libra and co scammers)
        //The simple version of Notify (if we dont want to use the unprivilidged user ban notify instead)
        //    if (message === "!Scammer") {
        //        bot.sendMessage({
        //            to: channelID,
        //            message: "@Moderators"
        //        });
        //    }

        //Additional sanity checks needed: 
        //is the user already banned? (can't implement this would only cover users in the guild sadly)

        //Ban users via Tag or ID if they already left the server 
        if (cmd === commandnametoban) {

            args.slice(2);
            var banReason = Array.prototype.slice.call(args, 2).join(" ").replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
            logger.silly("entered " + commandnametoban + " command region - cmd recognised!");
            logger.silly('Arg1 ' + args[1]);
            logger.debug('BanReason : ' + banReason);
            var tagsexist = false;
            var suppliedvalidarg = false
            usertoban = "";

            //See if there was a Tag
            if (args[1].substring(0, 3) == '<@!') {
                logger.silly("we got a tag so ID has other chars in it  -  sanitize");
                usertoban = args[1].substring(3, args[1].length - 1);
                logger.silly('User =  ' + usertoban);
                tagsexist = true;
                suppliedvalidarg = true;
            } else {
                logger.info("No Tags exist for bancommand, ban by ID: " + args[1]);
            }
            //no user tagged, assume banning by ID 
            if (tagsexist == false) {
                //check if ID was valid ID judging by length
                if (args[1].length == 18) {
                    var checkifitsamsg = bot.getMessage({
                        channelID: channelID,
                        messageID: args[1]
                    });
                    if (typeof checkifitsamsg == 'undefined') {
                        usertoban = args[1]
                        suppliedvalidarg = true;
                    } else {
                        argumentwasmsgidinstead = true
                    }

                }
                logger.silly("arg 1 length: " + args[1].length)
                logger.silly("suppliedvalidarg = " + suppliedvalidarg)
            }
            //Make sure we dont make cehcks on invlaid arguments if no users are supplied
            var targeteduserisnotprotected = true;
            logger.debug("supplied valid arg" + suppliedvalidarg)
            if (suppliedvalidarg) {
                //Check if user to ban is a protected User
                if (isuserprotected(usertoban)) {
                    targeteduserisnotprotected = false
                    logger.debug("usertoban" + usertoban)
                }
            }
            logger.debug("targeteduserisnotprotected" + targeteduserisnotprotected)
            if (userisprotected && suppliedvalidarg && targeteduserisnotprotected) {
                if (usertoban == userID) {
                    logger.info("User cant ban himself");
                } else {
                    try {
                        logger.info("Bannning user via Ban command");
                        var usertobanid = {
                            serverID: Servertocheck,
                            userID: usertoban,
                            reason: banReason,
                            lastDays: 1
                        }
                        bot.ban(usertobanid);

                        logger.info("trying to ban userid : " + usertoban + " for" + usertobanid.reason);
                        sendembed_basic(channelID, 3066993, "User Banned!", 'Alright, <@' + usertoban + '> has been banned for ' + usertobanid.reason, Footertext);
                   logger.silly("removing banproposal " + usertoban)
						//remove the banproposal from the list if 1 exists (might not exist yet, but cleanup to make sure)
                        var indexof = banproposals.indexOf(usertoban)

                       if (!(indexof == -1)){
						   banproposals.splice(indexof, 1)
					   } 
			   if (banproposals.length == 0) {
                    reportisactive = false;
                }

				   } catch (error) {
                        sendembed_basic(channelID, 0x442691, "Couldn't Ban", 'couldn\'t ban User Sorry! Make sure you supply a correct ID or Tag. \n Also we cannot ban a user twice ;)', Footertext);
                        logger.error("couldn't ban User: " + usertoban);
                    }
                }
            } else {
                //Either user has no rights to call this command, or there was an Invalid Argument used 
                var missingrightsmessage
                var missingrightstitle
                var usagestring = "`" + commandprefix + commandnametoban + " @usernametag reason for the ban \n" + commandprefix + commandnametoban + " 412331231244123413 reason for the ban`"
                if (mee6inteagration_cmdclear_enabled == true) {
                    usagestring += "\nIf I didn't clean up all spam automatically Mee6 might be able to help out with \n `!clear @usernametag numberofmsgs` \n"
                }
                //Check for errorconditions and set texts accordingly
                if (suppliedvalidarg && targeteduserisnotprotected && !(userID == usertoban) && !(helpargument.includes(args[1]) == true) && !(argumentwasmsgidinstead) ) {
                    if (acceptanddenybans) {
                        usagestring += "\nYou can also react to this embed using a " + banacceptedreaction[0] + "-Emoji to accept, or a " + bandeniedreaction[0] + " to deny this report immediatly!"
                    }
                    lastreportmsgid = event.d.id
                    usergotjustreported = true;
                    reporteduserIDviaemoji = usertoban
                    reporteduserIDviaemojibyuserid = userID

                    reportisactive = true;
					
					missingrightsmessage = '***Thanks alot*** for trying to help **' + bot.users[userID].username + '**, We passed it on to our Mods!'
                    missingrightstitle = "Thanks for the Report!"
                } else if (userID == usertoban) {
                    missingrightsmessage = 'Banning yourself is a bit Silly isn\'t it?'
                    missingrightstitle = "That won't work!"
                    usagestring = "`" + commandprefix + commandnametoban + " @NOTyourself reason for the ban" + "`"
                } else if (targeteduserisnotprotected == false) {
                    missingrightsmessage = 'No banning protected users with this Bot, sorry =)'
                    missingrightstitle = "Can't ban protected User!"
                } else if (helpargument.includes(args[1]) == true) {
                    missingrightsmessage = 'Have a look at the Syntax below:'
                    missingrightstitle = "Need help?"
                } else if (argumentwasmsgidinstead) {
                    missingrightsmessage = '***Thanks alot*** for trying to help **' + user + '**, however you entered a MessageID instead of a UserID.\nSee Usage below:'
                    missingrightstitle = "Invalid Argument!"
                } else if (!(args[1].length == 18)) {
                    missingrightsmessage = '***Thanks alot*** for trying to help **' + user + '**, however you entered an invalid UserID.\nSee Usage below:'
                    missingrightstitle = "Invalid UserID!"
                } else {
                    missingrightsmessage = '***Thanks alot*** for trying to help **' + user + '**, however I can\'t recognise this syntax Sorry'
                    missingrightstitle = "Invalid Syntax!"
                }

                //If user has missing rights but Arg was correct change msg accordingly
                if (tagagrouponmissingrights && suppliedvalidarg && targeteduserisnotprotected) {
                    missingrightsmessage += "\nWe notified " + missingrightsnotifytags + " to take a look when possible."
                } else if (suppliedvalidarg && targeteduserisnotprotected && (userID != usertoban)) {
                    missingrightsmessage += "\nWe noted down the ID for admins to take a look at!";
                }
                //Send differing embeds depending on data 
                //Let's see if we are in a Bot channel, we may want to inform if we are not to use another channel
				//Also prevent reporting a user twice, no need for that
				if (ChannelIDtorespondin.includes(channelID) || ChannelIDtorespondin.length == 0  && (banproposals.includes(usertoban))){
					if (suppliedvalidarg && targeteduserisnotprotected) {
                         sendembed_basic(channelID, 3066993, "Already Reported", "We already got a Report for this User, please be patient!", Footertext);
                    }
				}
                if (ChannelIDtorespondin.includes(channelID) || ChannelIDtorespondin.length == 0 && !(banproposals.includes(usertoban))) {
                    //no need for "Reported user ID" section if it was invalid or a reported ID was a protected user
                    if (suppliedvalidarg == false || targeteduserisnotprotected == false) {
                        sendembed_report(channelID, 0x442691, missingrightstitle, missingrightsmessage, Footertext, "NONE", usagestring, banReason);
                    } else {

                        usergotjustreported = true;
                        reporteduserIDviaemoji = usertoban

                        setTimeout(() => sendembed_report(channelID, 0x442691, missingrightstitle, missingrightsmessage, Footertext, usertoban, usagestring, banReason), 666);
                        if (tagagrouponmissingrights && suppliedvalidarg) {

                            setTimeout(() => bot.sendMessage({
                                to: channelID,
                                message: missingrightsnotifytags + " Have a look at this please, the reported ID is in the Info-Card"
                            }, (err, res) => {
                                anwsermsgid = (res.id);
                                //	logger.info("anwserid: " + anwsermsgid)
                            }), 1);

                        }
                    }
                }
            }
        }

    }


    //keep list of msg authors for later and set needed variables in array
    var listobject, isabotmsg
    if (usergotjustreported) {
        //reporteduserIDviaemoji contains the userid of reported msgauthor
        if (!(banproposals.includes(reporteduserIDviaemoji))) {
            banproposals.push(reporteduserIDviaemoji)
        }

		isabotmsg = true
        usergotjustreported = false
        logger.silly("reporteduserIDviaemoji (usertoban) set for this report msg: " + reporteduserIDviaemoji)
    } else {
            isabotmsg = false
    }
	listobject = {
            msgid: event.d.id,
            author: userID,
            botmsg: isabotmsg,
            usertoban: reporteduserIDviaemoji,
            reportedby: reporteduserIDviaemojibyuserid,
            origmsgid: event.d.id,
            origmsg: message,
            anwsermsg: anwsermsgid,
            lastreportmsgid: event.d.id
        }
	//Cleanup the Msgauthorarray to prevent Mem overflows
	var msgsperdaywith1msgaminute = 1440*1
	if (msgidauthorarray.length > msgsperdaywith1msgaminute * 5){
		msgidauthorarray.slice(1, msgidauthorarray.length)
	}	
    logger.silly("msgid: " + event.d.id + "from author: " + userID)
    setTimeout(() => msgidauthorarray.push(listobject), 1111);
    if (!(typeof listobject.anwsermsg == 'undefined')) {
        logger.silly("anwsermsgid after pushin list object in list: " + listobject.anwsermsg + "with msgid " + event.d.id)
    }
	eventisbeeingprocessed = false;
});

function containsknownspam(message, userID, msgid, channelID, isuserprotected, onlyprintdebug = false) {
    if (onlyprintdebug) {
        logger.silly(message);
        return false;
    }
    logger.debug("checking msg: " + message);
    for (var knownspam in knownscamcopypastecontents) {
        logger.silly("spam included in message: " + message + "  \n" + message.includes(knownscamcopypastecontents[knownspam]));
        //API Rate Issues if enabled - onyl debuging logger.silly("user is protected: " + isuserprotected(userID));
        if (message.includes(knownscamcopypastecontents[knownspam])) {

            logger.info("knownspam in knownscamcopypastecontents:  " + knownscamcopypastecontents[knownspam]);
            if (!isuserprotected) {
                //Fix Spambot behaviour and delete message before banning (this ensures the message get wiped even if user leaves) 
                var deleteparams = {
                    channelID: channelID,
                    messageID: msgid
                }
                logger.debug("deleting message " + deleteparams.messageID + " from User: (" + userID + ") because of known spam");
                bot.deleteMessage(deleteparams);
                //no mercy for spammers - byebye <3 
                usertoban = {
                    serverID: Servertocheck,
                    userID: userID,
                    reason: "Spamprotection by PersonatorBot",
                    lastDays: 1
                }
                if (punishaction == "ban") {
                    logger.debug("Banning User " + userID + " for" + usertoban.reason);
                    bot.ban(usertoban);
                } else {
                    usertokick = {
                        serverID: Servertocheck,
                        userID: userID
                    }
                    logger.debug("Kicking User " + userID + " because of known spam");
                    bot.kick(usertokick);
                }
            }
            return true;
        }
    }
    return false;
}

async function getTextFromImage(imageurl, userID, msgid, channelID, rectangle, isuserprotected) {

    const image = imageurl;
    const scheduler = createScheduler();
    logger.debug(`Recognizing ${image}`);
    const worker = createWorker({
        logger: m => logger.silly(m),
    });

    var recognisedtxt = "";

    //Run the jobs via OCR Worker Async
    (async () => {
        await worker.load();
        await worker.loadLanguage('eng');
        await worker.initialize('eng');
        await worker.setParameters({
            tessedit_pageseg_mode: 6,
        });

        //Allright, since OCR can be Tricky, let's run 3 Jobs on our Worker, 1 for the top, 1 for the bottom and 1 for the whole picture (without rectangle) 
        const {
            data: {
                text
            }
        } = await worker.recognize(imageurl, {
            rectangle
        });
        recognisedtxt += text;


        logger.silly(recognisedtxt);
        await worker.terminate();
        //Check for Spam with "new" Textstring from OCR
        containsknownspam(recognisedtxt, userID, msgid, channelID, isuserprotected, OCRonlydebug);
        return recognisedtxt
    })();

}

function sendembed_basic(channelID, color, titlestr, description, Footertext) {
    bot.sendMessage({
        to: channelID,
        embed: {
            color: color,
            title: titlestr,
            description: description,
            thumbnail: {
                url: ""
            },
            footer: {
                text: Footertext,
            },
        }
    });
}

function sendembed_report(channelID, color, titlestr, description, Footertext, usertoban, usagestring, banreason) {
    if (usertoban == "NONE") {
        bot.sendMessage({
            to: channelID,
            embed: {
                color: color,
                title: titlestr,
                description: description,
                fields: [{
                    name: "Usage:",
                    value: usagestring
                }],
                thumbnail: {
                    url: ""
                },
                footer: {
                    text: Footertext,
                },
            }
        });
    } else {
        bot.sendMessage({
            to: channelID,
            embed: {
                color: color,
                title: titlestr,
                description: description,
                fields: [{
                        name: "Report:",
                        value: "The UserID: " + usertoban + " was reported for " + banreason 
                    },
                    {
                        name: "Usage:",
                        value: usagestring
                    }
                ],
                thumbnail: {
                    url: ""
                },
                footer: {
                    text: Footertext,
                },
            }
        });
    }
}

function isuserprotected(userid) {
    //Check if messaging user is a memeber of a protected Role
    logger.debug("Bot is monitoring " + Memberstoprotect.length + " protected Usernames");
    logger.debug(Memberstoprotect);
    if (Memberstoprotect.includes(userid)) {
        return true;
    } else {
        return false;
    }
}


function Getalluserdataandbuildarrays() {
	cachesareuptodate = false;
	//Wait for events to finish processing before rug pulling them
	while(eventisbeeingprocessed){} //literally dead code to wait for data to be synced fully
	
    logger.silly("Servers : " + bot.servers);
    //Grab all Users we know of on the Server to protect

    bot.getAllUsers();
    //Force Cache to update by grabbing all users explicitly
    var input = {
        limit: 99999,
    }
    bot.getMembers(input);
    //overwrite current userarray
    AllUserstmp = bot.servers[Servertocheck].members;
    //AllUsers = bot.users
    logger.silly("Users:")
    var usercount = 0;
    for (var user in AllUserstmp) {
        if (AllUserstmp.hasOwnProperty(user)) {
            logger.silly(user + ": " + AllUserstmp[user])
            usercount += 1;
        }
    }
    logger.verbose("User count: " + usercount);
    logger.verbose("Total Membercount: " + bot.servers[Servertocheck].member_count);
    //Grab all Roles on the Server


    logger.debug("API Call bot.getAllUsers();")
    bot.getAllUsers();


    //reset memberstoprotect array
    Memberstoprotect = [];
    //Let's get a list of all users and check if they are protected


    //Grab all Serverroles
    var AllRoles = bot.servers[Servertocheck].roles;
    //Grab ID's of Mentioned Roles to protect
    var IDstoprotect = [];
    for (var Role in AllRoles) {
        if (RolestoCheck.includes(AllRoles[Role].name)) {
            IDstoprotect.push(AllRoles[Role].id);
        }
    }
    for (var user in AllUserstmp) {
        //if (typeof bot.servers[Servertocheck].members[user] == 'undefined'){
        //Member is not a member of the server anymore, so can't be protected user
        //	logger.debug("Couldn't find user in Guildlist, is he a Member?")
        //	return false;
        //}
        //Check if messaging user is a memeber of a protected Role
        var userisprotected = false //we assume as protected users are allowed to ban for now - needs improvement.

        var memberroles = bot.servers[Servertocheck].members[user].roles;
        for (var role in memberroles) {
            if (IDstoprotect.includes(memberroles[role])) {
                userisprotected = true
                logger.silly("Member " + user + " is protected: " + Memberstoprotect.includes(user));
            }
        }

        if (userisprotected) {
            logger.debug("pushing user to protected users" + user);
            Memberstoprotect.push(user);
            //Keep a cache 
            AllUsersCache.push({
                userid: user,
                userisprotected: true
            })
        } else {
            //Keep a cache - if a user is not included its likely he is new and therefore likely not protected. 
            //this could be used to triggger a rebuild of the arrays tho (But doing this on every rename or message seems API overkill, let's respect discords API Rate limits as we are a friendly bot =) ) 
            AllUsersCache.push({
                userid: user,
                userisprotected: false
            })
        }

    }
	Membersnamestoprotect = [];
    //Since we know which users are protected now, note down names to protect
    for (var user in bot.users) {
        if (Memberstoprotect.includes(bot.users[user].id)) {
            Membersnamestoprotect.push(bot.users[user].username);
        }
    }

    logger.debug("All protected Users:");

    var i;
    for (i = 0; i < Memberstoprotect.length - 1; i++) {
        logger.verbose(Memberstoprotect[i]);
    }
	cachesareuptodate = true;
    if (userisprotected) {
        return true;
    } else {
        return false;
    }
}

//Function to actualy build current user Array's and check for same username's
function runcheck() {
    AllUsers = bot.servers[Servertocheck].members;

    tmpstring = "The following User's got";
    banReason = "Impersonation autodetection by PersonatorBot"
    var partialmatchfound = false;
    for (var user in AllUsers) {
        var usernameplain = bot.users[user].username;
        logger.silly("checking username: " + usernameplain + " -  " + " : is similar to protected name? " + Membersnamestoprotect.includes(usernameplain));
        logger.silly("Length of username :" + (usernameplain).length);
        //	var usernameconverted = convertInputReverse(usernameplain).lower; //currently there is no fuzzing Lib used
        //check if minimal length is satisfied - if not bail
        if (usernameplain.length > minnamelengthtoprotect) {
            //Check if user is a protected member by userid - if so bail
            if (Memberstoprotect.includes(user) == false) {
                logger.silly("User is not protected");
                //Check if username matches (exactly) with protected User
                var Usernameisprotectedadwasimpersonated = false;
                logger.silly(Membersnamestoprotect[Membersnamestoprotect.indexOf(usernameplain)]);
                logger.silly(usernameplain);
                logger.silly("Names match exactly: " + Membersnamestoprotect[Membersnamestoprotect.indexOf(usernameplain)] == usernameplain);
                var arraycontinasusername = (Membersnamestoprotect.indexOf(usernameplain) > -1);
                if (arraycontinasusername) {

                    if (Membersnamestoprotect[Membersnamestoprotect.indexOf(usernameplain)] == usernameplain) {
                        Usernameisprotectedadwasimpersonated = true;
                    }
                }

                if (Usernameisprotectedadwasimpersonated) {
                    //Check how harsh the checking is - may ignore the discriminator (#numbers) 
                    if (includediscriminator) {
                        //remember we got a partial match, even if we don't want to ban/kick those users - we may want to warn some users.
                        partialmatchfound = true;
                        if (warnforpotentialmatch) {
                            tmpstring += " Warned - similar Names as protected User:\nID: " + bot.users[user].id + "  Handle: " + bot.users[user].username + "\n"
                        }
                        if (bot.users[user].username + bot.users[user].discriminator == bot.users[Memberstoprotect[Membersnamestoprotect.indexOf(bot.users[user].username)]].username + bot.users[Memberstoprotect[Membersnamestoprotect.indexOf(bot.users[user].username)]].discriminator) {

                            logger.warn(punishaction + " User: " + user + " : " + bot.users[user].username);
                            //ban users
                            if (punishaction == "ban") {
                                logger.silly(bot.users[user].id);
                                logger.silly(user);
                                var usertoban = {
                                    serverID: Servertocheck,
                                    userID: bot.users[user].id,
                                    reason: banReason,
                                    lastDays: 1
                                }
                                bot.ban(usertoban);
                                tmpstring += " banned:\nID: " + bot.users[user].id + "  Handle: " + bot.users[user].username + "\n"
                            } else {
                                //assume kick
                                logger.silly(bot.users[user].id);
                                logger.silly(user);
                                var usertokick = {
                                    serverID: Servertocheck,
                                    userID: bot.users[user].id
                                }
                                bot.kick(usertokick);
                                tmpstring += " kicked:\nID: " + bot.users[user].id + "  Handle: " + bot.users[user].username + "\n"
                            }
                        }
                    } else {

                        logger.info("Punishing User: " + user + " : " + bot.users[user].username);
                        //ban users
                        if (punishaction == "ban") {
                            try {
                                logger.silly(bot.users[user].id);
                                logger.silly(user);
                                var usertoban = {
                                    serverID: Servertocheck,
                                    userID: bot.users[user].id,
                                    reason: banReason,
                                    lastDays: 1
                                }
                                bot.ban(usertoban);
                                tmpstring += " banned:\nID: " + bot.users[user].id + "  Handle: " + bot.users[user].username + "\n"
                            } catch (e) {
                                logger.debug(e)
                            }
                        } else {
                            //assume kick
                            //try {
                            logger.silly(bot.users[user].id);
                            logger.silly(user);
                            var usertokick = {
                                serverID: Servertocheck,
                                userID: bot.users[user].id
                            }
                            bot.kick(usertokick);
                            logger.silly("Boolean value of kick command:");
                            logger.silly(bot.kick(Servertocheck, bot.users[user].id));
                            tmpstring += " kicked:\nID: " + bot.users[user].id + "  Handle: " + bot.users[user].username + "\n"
                        }
                    }
                }
            }
        }
    }
    //return our message to interactively display it in case a user triggered a scan (otherwise stay silent)
    logger.debug(" end of  dataset");
    return tmpstring
}
