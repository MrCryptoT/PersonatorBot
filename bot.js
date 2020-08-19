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
var includediscriminator = false; //disallow the same name even if discriminator is not the same - if true MrT#1234 and MrT#4321 can both be on the Server even if 1 of them is protected
var Loglevel = "debug"; //error: 0,  warn: 1,  info: 2,  http: 3,  verbose: 4,  debug: 5,  silly: 6 - always displays selected level and lower

//	Commands	
var commandprefix = "!"; //Mostly for debugging as scanning takes places when users join or rename
var commandnametoban = "ban"; //banning via userid (calling user still needs proper rights)
var helpargument = ["help", "info"];

//	Elaborate Setup
var mee6inteagration_cmdclear_enabled = false;

var banacceptedreaction = ["✅"];
var deleteafterreaction = false;

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
var auth = require('./auth.json');//Discord Bot Token
const { createWorker, PSM, createScheduler } = require('..\\node_modules\\tesseract.js\\src');
var Canvas = require('canvas');
var https = require("https");
var fs = require('fs');

//Init Vars for use later
var Memberstoprotect = [];
var Membersnamestoprotect = [];
var Memberstoban = [];
var MembersIDtoban = [];
 
const { combine, timestamp, label, printf } = winston.format;
const myFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`;
}); 
 
const logger = winston.createLogger({
  level: 'info',
  format: combine(
    label({ label: process.env.COMPUTERNAME }),
    timestamp(),
    myFormat
  ),
//  format: winston.format.combine(
//    winston.format.timestamp(),
//    winston.format.json()
//   ),
//  defaultMeta: { service: 'Personator Bot' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
	new winston.transports.File({ filename: 'Log.log', level: Loglevel }),
    new winston.transports.File({ filename: 'Debug.log', level: 'debug' }),
	new winston.transports.Console({ level: 'info', 'timestamp':true, colorize: true}),
  ],
});


// Initialize Discord Bot
var bot = new Discord.Client({
	token: auth.token,
	autorun: true
});

bot.on('ready', function (evt) {
	logger.info('Connected, Bot ready');
    logger.debug('Logged in as: ' + bot.username + ' - (' + bot.id + ')');
	bot.getAllUsers();
	var input = {
		limit: 99999,
	}
	bot.getMembers(input);
    setTimeout(() => runcheck(), 1500);

});

//Event to fire if bots Disconencts (fix for stopping bot after certain amount of hours)
bot.on('disconnect', (msg, code) => {
    if (code === 0) return console.error(msg);
    bot.connect();
});

//Event fire's on new users joining the "guild" (guild = Discord Server - damn discord's programmers are Gaming oriented)
bot.on('guildMemberAdd', function (member) {
	logger.info(member.id + 'ID joined!');
	logger.info(member.discriminator + 'name!');
	//Run a Check whenever a new user joins
	runcheck();
});

//Event fires on a name Change of a User already in our Guild
bot.on('guildMemberUpdate', function (oldMember, newMember) {
	logger.info('User renamed to: ' + newMember.username);
	//Run a Check whenever a user changes his name
	runcheck();
});

//Event fires on a reaction to some Message
bot.on('messageReactionAdd', function (messageReaction, user, event) {


	//Check if reacting user is a memeber of a protected Role
		userisprotected = isuserprotected(messageReaction.d.user_id)
	var reactingmessageid = messageReaction.d.message_id;
	var reactinguserid = messageReaction.d.user_id;
	var emoji = messageReaction.d.emoji
	var reactedinchannelid = messageReaction.d.channel_id
	logger.debug("reacting user is protected: " + isuserprotected(reactinguserid));
	logger.silly(messageReaction);
	if (emoji.name == Reportemoji){
		logger.debug("Reportemoji detected");
		if (Reportonemojireaction){
			
		}
	}
	logger.silly("reactedinchannelid : " + reactingmessageid + " due to Reaction: " + emoji.name );
	if (banacceptedreaction.includes(emoji.name) && deleteafterreaction && isuserprotected(reactinguserid)){
		logger.info("Removing our message due to reaction of protected user: " + reactingmessageid);
		var delparams = {
			 channelID: reactedinchannelid,
			 messageID: reactingmessageid
		}
		bot.deleteMessage(delparams);
	}
});

//Event that fires on new messages in the Server (Command)
bot.on('message', function(user, userID, channelID, message, event) {
	//set Footertext for embeds (thank u msg)
	var Footertext = "Thanks alot " + user + " for helping us in the fight against spammers and scammers! â¤ï¸";
	//Now do message specific stuff
	//logger.debug("Roles of calling user:");

	//Check if messaging user is a memeber of a protected Role
	userisprotected = isuserprotected(userID); //we assume as protected users are allowed to ban for now - needs improvement.
	logger.debug("is user" + userID + " protected : " + isuserprotected(userID));
	if (copypastespamprotectionenabled) {
		//Check if msg contains spam, if so, we don't need to check attatchment (prenet race conditions with async) 
		if (!containsknownspam(message, userID, event.d.id)){
			//No spam in default msg, check if there is an attatchment URL, if so OCR it
			logger.silly("attatchment undefined??");
			logger.silly(typeof event.d.attachments[0]== 'undefined');
			//event.d.attachments[i].url represents an attatchment, check if defined
			if ((typeof event.d.attachments[0]== 'undefined') == false && OCREnabled){
				logger.debug("Trying to OCR");
								
				var picheight = 900
				var picwidth = 1080
				var headerheight = 150
				var heightdiff = picheight - headerheight
				logger.silly("Pic Dimensions: " + picheight + " by " +  picwidth);

			//Start Async workers (Spam check handled in callback/checkforspam is triggered again after recognising)	
				const rectangletop = { left: 0, top: 0, width: 777, height: headerheight }
				const rectanglebottom = { left: 0, top: heightdiff, width: picwidth, height: headerheight }
				const rectangleall = { left: 0, top: 0, width: picwidth, height: picheight }

			;(async () => {
				//Async call for rectangletop
				await getTextFromImage(event.d.attachments[0].url, userID, event.d.id, channelID, rectangletop);
			})()
			;(async () => {
				//Async call for rectangletop
				await getTextFromImage(event.d.attachments[0].url, userID, event.d.id, channelID, rectanglebottom);
			})()
			//End of OCR Part - we triggered the worker so continue with other messageevent related code
			}
		}
	}
	
	//we are not in a Bot Channel, maybe inform if choosen to do so and if it's a command for us 
if (message.substring(0, 1) == commandprefix && staysilentonwrongchannelusedforcommand == false && (ChannelIDtorespondin.length > 0 && (!ChannelIDtorespondin.includes(channelID))) ){
	logger.info("Informing User about wrong channel for Bot Interaction");
			sendembed_basic(channelID, 14177041, "Wrong Channel", wrongchanneldescriptionforcommand, Footertext);
	}
	
	//check if this is a command and if we are in bot channel
	if (message.substring(0, 1) == commandprefix && (ChannelIDtorespondin.includes(channelID) || ChannelIDtorespondin.length == 0)) {
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
			const banReason = args.slice(2);
			logger.silly("entered " + commandnametoban + " command region - cmd recognised!");
			logger.silly('Arg1 ' + args[1]);
			logger.silly('Arg2 ' + args[2]);
			var tagsexist = false;
			var suppliedvalidarg = false  
			usertoban = "";
			
			//See if there was a Tag
			if (args[1].substring(0, 3) == '<@!') {
				logger.silly("we got a tag so ID has other chars in it  -  sanitize");
				usertoban = args[1].substring(3, args[1].length -1);
				logger.silly('User =  ' + usertoban);
				tagsexist = true;
				suppliedvalidarg = true;
			 } else  {
				 logger.info("No Tags exist for bancommand, ban by ID: " + args[1]);
		  }
		//no user tagged, assume banning by ID 
		if (tagsexist == false) {
			//check if ID was valid ID judging by length
			if (args[1].length == 18) {
				usertoban = args[1]
				suppliedvalidarg = true;
			}
		logger.silly("arg 1 length: " + args[1].length)
		logger.silly("suppliedvalidarg = " + suppliedvalidarg)			
		}
		//Make sure we dont make cehcks on invlaid arguments if no users are supplied
		var targeteduserisnotprotected = true;
		logger.debug("supplied valid arg" + suppliedvalidarg)
		if (suppliedvalidarg) {
		//Check if user to ban is a protected User
			if (isuserprotected(usertoban)){
				targeteduserisnotprotected = false
				logger.debug("usertoban" + usertoban)
			}
		}
		logger.debug("targeteduserisnotprotected" + targeteduserisnotprotected)
		if (isuserprotected(userID) && suppliedvalidarg && targeteduserisnotprotected) {
			if (usertoban == userID){
				logger.info("User cant ban himself");
			}else{
			   try {  
				   logger.info("Bannning user via Ban command");
				   var usertobanid = {
						serverID : Servertocheck,
						userID : usertoban
						}
					bot.ban(usertobanid);
					logger.info("trying to ban userid : " + usertoban);
					sendembed_basic(channelID, 3066993, "User Banned!", 'Alright, <@' + usertoban + '> has been banned for ' + banReason, Footertext);
				} 
				catch (error) {
					sendembed_basic(channelID, 0x442691, "Couldn't Ban", 'couldn\'t ban User Sorry! Make sure you supply a correct ID or Tag. \n Also we cannot ban a user twice ;)',  Footertext);
					logger.error("couldn't ban User: " + usertoban );
				}
			}
		}else {
		//Either user has no rights to call this command, or there was an Invalid Argument used 
			var missingrightsmessage
			var missingrightstitle
			var usagestring = "`" + commandprefix + commandnametoban + " @usernametag reason for the ban \n" + commandprefix + commandnametoban + " 412331231244123413 reason for the ban`"
			if (mee6inteagration_cmdclear_enabled == true){
				 usagestring += "\nIf I didn't clean up all spam automatically Mee6 might be able to help out with \n `!clear @usernametag numberofmsgs` \n"
			}
			//Check for errorconditions and set texts accordingly
			if (suppliedvalidarg && targeteduserisnotprotected) {
				missingrightsmessage = '***Thanks alot*** for trying to help **' + user + '**, however you don\'t have the rights to use this command Sorry.'
				missingrightstitle = "Missing Rights!"
			}else if (userID == usertoban) {
				missingrightsmessage = 'Banning yourself is a bit Silly isn\'t it?'
				missingrightstitle = "That won't work!"
				usagestring = "`" + commandprefix + commandnametoban + " @NOTyourself reason for the ban" + "`"
			}else if (targeteduserisnotprotected == false) {
				missingrightsmessage = 'No banning protected users with this Bot, sorry =)'
				missingrightstitle = "Can't ban protected User!"
			}else if (helpargument.includes(args[1]) == true) {
				missingrightsmessage = 'Have a look at the Syntax below:'
				missingrightstitle = "Need help?"
			}else if (!(args[1].length == 18)) {
				missingrightsmessage = '***Thanks alot*** for trying to help **' + user + '**, however you entered an invalid UserID.\nSee Usage below:'
				missingrightstitle = "Invalid UserID!"
			}else {
				missingrightsmessage = '***Thanks alot*** for trying to help **' + user + '**, however I can\'t recognise this syntax Sorry'
				missingrightstitle = "Invalid Syntax!"
			}
			
			//If user has missing rights but Arg was correct change msg accordingly
			if (tagagrouponmissingrights && suppliedvalidarg && targeteduserisnotprotected) {
				missingrightsmessage +=  "\nWe notified " + missingrightsnotifytags + " to take a look when possible."
			} else if (suppliedvalidarg && targeteduserisnotprotected && (userID != usertoban)){
				missingrightsmessage +=  "\nWe noted down the ID for admins to take a look at!";
			}
			//Send differing embeds depending on data 
			//Let's see if we are in a Bot channel, we may want to inform if we are not to use another channel
			if (ChannelIDtorespondin.includes(channelID) || ChannelIDtorespondin.length == 0 ){
				//no need for "Reported user ID" section if it was invalid or a reported ID was a protected user
				if (suppliedvalidarg == false || targeteduserisnotprotected == false){
					sendembed_report(channelID, 0x442691, missingrightstitle, missingrightsmessage, Footertext, "NONE", usagestring);
				} else {
					sendembed_report(channelID, 0x442691, missingrightstitle, missingrightsmessage, Footertext, usertoban, usagestring);
					if (tagagrouponmissingrights && suppliedvalidarg) {
						bot.sendMessage({
							to: channelID,
							message: missingrightsnotifytags + " Have a look at this please, the reported ID is in the Info-Card" 
							});
					}	
				}
			}
		}
	}

	}
	
});

function containsknownspam(message, userID, msgid, channelID, onlyprintdebug = false){
	if (onlyprintdebug) {
		logger.verbose(message);
		return false;
	}
	logger.debug("checking msg: " + message);
	for (var knownspam in knownscamcopypastecontents) {
			logger.silly("spam included in message: " + message + "  \n" + message.includes(knownscamcopypastecontents[knownspam]));
			logger.silly("user is protected: " + isuserprotected(userID));
			if (message.includes(knownscamcopypastecontents[knownspam])) {
				
				logger.info("knownspam in knownscamcopypastecontents:  " + knownscamcopypastecontents[knownspam]);
				if (!isuserprotected(userID)){
					//Fix Spambot behaviour and delete message before banning (this ensures the message get wiped even if user leaves) 
					var deleteparams = {
						channelID : channelID,
						messageID : msgid
					}
					logger.debug("deleting message " + deleteparams.messageID + " from User: (" + userID + ") because of known spam");
					bot.deleteMessage(deleteparams);
					//no mercy for spammers - byebye <3 
					usertoban = {
						serverID : Servertocheck,
						userID : userID
					}
					if (punishaction == "ban"){	
						logger.debug("Banning User " + userID + " because of known spam");
						bot.ban(usertoban);
					}else{
						logger.debug("Kicking User " + userID + " because of known spam");
						bot.kick(usertoban);	
				}
			}
			return true;
		}		
	}
	return false;
}


async function getTextFromImage(imageurl, userID, msgid, channelID, rectangle) {

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
  const { data: { text } } = await worker.recognize(imageurl, { rectangle});
  recognisedtxt += text;


  logger.silly(recognisedtxt);
  await worker.terminate();
  //Check for Spam with "new" Textstring from OCR
  containsknownspam(recognisedtxt, userID, msgid, channelID, OCRonlydebug);
  return recognisedtxt
})();

}

function sendembed_basic(channelID, color, titlestr, description, Footertext){
	 bot.sendMessage({ to:channelID,
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
function sendembed_report(channelID, color, titlestr, description, Footertext, usertoban, usagestring){
		if (usertoban == "NONE"){
			bot.sendMessage({
				to: channelID,
				embed: {
				  color: color,
				  title: titlestr,
				  description: description,
				   fields: [
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
		}else{
			bot.sendMessage({
				to: channelID,
				embed: {
				  color: color,
				  title: titlestr,
				  description: description,
				   fields: [{
						name: "Reported User ID:",
						value: "When Admins look at this, please check the following ID: " + usertoban
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
function isuserprotected(userid){
	bot.getAllUsers();
	var input = {
		limit: 99999,
	}
	bot.getMembers(input);

	var author = {
	serverID: Servertocheck,
	userID: userid,
	}
	var member;
	 setTimeout(() =>  member = bot.getMember(author), 1500);
	//member = bot.getMember(author);
	   
	//Grab Roles of messaging user
	if (typeof bot.servers[Servertocheck].members[userid] == 'undefined'){
		//Member is not a member of the server anymore, so can't be protected user
		return false;
	}
	var memberroles = bot.servers[Servertocheck].members[userid].roles;
	//logger.debug(memberroles);	
	//Grab all Serverroles
	var AllRoles = bot.servers[Servertocheck].roles;
	//Grab ID's of Mentioned Roles to protect
	var IDstoprotect = [];
	for (var Role in AllRoles) {
		if (RolestoCheck.includes(AllRoles[Role].name)) {
			IDstoprotect.push(AllRoles[Role].id);
		}
	}
	//Check if messaging user is a memeber of a protected Role
	var userisprotected = false //we assume as protected users are allowed to ban for now - needs improvement.
	for (var role in memberroles) {
	if  (IDstoprotect.includes(memberroles[role])){
		userisprotected = true
		}
	}
	
	if (userisprotected){
		return true;
	}else{
		return false;
	}
}

//Function to actualy build current user Array's and check for same username's
function runcheck(){
		logger.silly("Servers : " + bot.servers);	
	//Grab all Users we know of on the Server to protect
	
	//var AllUsers = bot.getAllUsers();
	
	
	bot.getAllUsers();
	//Force Cache to update by grabbing all users explicitly
	var input = {
		limit: 99999,
	}
	bot.getMembers(input);
	
	var AllUsers = bot.servers[Servertocheck].members;
	

	//var AllUsers = bot.getAllUsers();
	logger.silly("Users:")
	var usercount = 0;
	for (var property in AllUsers) {
		if( AllUsers.hasOwnProperty( property ) ) {
		   logger.silly(property + ": " + AllUsers[property])
		   usercount += 1;
		}
	}
	logger.verbose("User count: " + usercount);
	logger.verbose("Total Membercount: " + bot.servers[Servertocheck].member_count);
	//Grab all Roles on the Server
	
	logger.debug("add users to memberstoprotect");
	for (var user in AllUsers) {
		if (isuserprotected(user)){
		Memberstoprotect.push(user);
		}
	}

	for (var user in bot.users) {
		if (isuserprotected(bot.users[user].id)) {
		Membersnamestoprotect.push(bot.users[user].username);	
		}
	}
	logger.debug("All protected Users:");
	for (var property in Memberstoprotect) {
    if( Memberstoprotect.hasOwnProperty( property ) ) {
       logger.verbose(property + ": " + Memberstoprotect[property]);
		}
	}
	Memberstoban = [];
	tmpstring = "The following User's got";
	var partialmatchfound = false;
	for (var user in AllUsers) {
		var usernameplain = bot.users[user].username;
		logger.debug("checking username: " + usernameplain + " -  " +  " : is similar to protected name? " + Membersnamestoprotect.includes(usernameplain));
		logger.silly( "Length of username :" + (usernameplain).length); 
		//	var usernameconverted = convertInputReverse(usernameplain).lower; //currently there is no fuzzing Lib used
		//check if minimal length is satisfied - if not bail
		if (usernameplain.length > minnamelengthtoprotect){
		logger.debug("Member " + user + " is protected: " + isuserprotected(user));
		//Check if user is a protected member by userid - if so bail
		if (isuserprotected(user) == false) {
			logger.debug("User is not protected");
			//Check if username matches (exactly) with protected User
			var Usernameisprotectedadwasimpersonated = false;
			logger.debug( Membersnamestoprotect[Membersnamestoprotect.indexOf(usernameplain)]);
			logger.debug(usernameplain);
			logger.debug("Names match exactly: " + Membersnamestoprotect[Membersnamestoprotect.indexOf(usernameplain)] == usernameplain);
			var arraycontinasusername = (Membersnamestoprotect.indexOf(usernameplain) > -1);
			if (arraycontinasusername){
				
				if (Membersnamestoprotect[Membersnamestoprotect.indexOf(usernameplain)] == usernameplain){
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
					if (bot.users[user].username + bot.users[user].discriminator == bot.users[Memberstoprotect[Membersnamestoprotect.indexOf(bot.users[user].username)]].username + bot.users[Memberstoprotect[Membersnamestoprotect.indexOf(bot.users[user].username)]].discriminator){
						Memberstoban.push(user);
						MembersIDtoban.push(bot.users[user].id);
						logger.warn(punishaction + " User: " + user + " : " +  bot.users[user].username);	
						//ban users
						if (punishaction == "ban"){
							logger.silly(bot.users[user].id);
							logger.silly(user);
							var usertoban = {
							serverID : Servertocheck,
							userID : bot.users[user].id
							}
							bot.ban(usertoban);
							tmpstring += " banned:\nID: " + bot.users[user].id + "  Handle: " + bot.users[user].username + "\n"
						}else {
							//assume kick
							logger.silly(bot.users[user].id);
							logger.silly(user);
								var usertokick = {
								serverID : Servertocheck,
								userID : bot.users[user].id
								}
							bot.kick(usertokick);
							tmpstring += " kicked:\nID: " + bot.users[user].id + "  Handle: " + bot.users[user].username + "\n"
							}
					}			
				} else {
						Memberstoban.push(user);
						MembersIDtoban.push(bot.users[user].id);
						logger.info("Punishing User: " + user + " : " +  bot.users[user].username);	
						//ban users
						if (punishaction == "ban"){
								try {
							logger.silly(bot.users[user].id);
							logger.silly(user);
							var usertoban = {
								serverID : Servertocheck,
								userID : bot.users[user].id
								}
							bot.ban(usertoban);
							tmpstring += " banned:\nID: " + bot.users[user].id + "  Handle: " + bot.users[user].username + "\n"
							} catch (e) {
								 logger.debug(e)
							}
						}else {
							//assume kick
							//try {
							logger.silly(bot.users[user].id);
							logger.silly(user);
							var usertokick = {
								serverID : Servertocheck,
								userID : bot.users[user].id
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
