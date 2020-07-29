//Grab the legit Mod/Admin Users and protect them from Impersonation
//can be expanded on 

//Approach: 
//Scan for similar Usernames as in specified Roles and if found kick or Ban (depending on Config) 
//For long enough usernames we can also search character by character and calculate the match
//this should be used carefully though as short usernames may match quite quickly (anything under 6 chars is probably overkill)

//Also if the discriminator does not match we may only want to warn instead of banning/kicking
//Same is true for "%"-matches if a username is really close to a protected Member


//Config Area
var RolestoCheck = ['Moderators', 'Admins', 'Trusted Trader']; //Names of Roles to protect
var Servertocheck = "yourserverid" //Server ID to protect
var Loglevel = "info" //error: 0,  warn: 1,  info: 2,  http: 3,  verbose: 4,  debug: 5,  silly: 6 - always displays selected level and lower
var minnamelengthtoprotect = 6; //checks will be ignored if username shorter than this (without discriminator)
var includediscriminator = false; //allow the same name if discriminator is not the same 
var warnforpotentialmatch = true; //Warn for potential matchess where name is same but discriminator is different
//req's
var Discord = require('discord.io'); //Discord API Library - not too current but works
var logger = require('winston'); //Logger Lib
var auth = require('./auth.json');//Discord Bot Token
var punishaction = "kick" //or "ban" or "warn"
var knownscamcopypastecontents = ["Hey Libra just released" , ""] //implement this later for the usual "hey libra released" spam


//Init Vars for use later
var Memberstoprotect = []
var Membersnamestoprotect = []
var Memberstoban = []
var MembersIDtoban = []

// Init logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});

logger.info('Started Logger - starting Bot');
logger.level = Loglevel;
// Initialize Discord Bot
var bot = new Discord.Client({
   token: auth.token,
   autorun: true
});

bot.on('ready', function (evt) {
    logger.info('Connected, Bot ready');
    logger.debug('Logged in as: ');
    logger.debug(bot.username + ' - (' + bot.id + ')');
    runcheck();
});

//Event fire's on new users joining the "guild" (guild = Discord Server - damn discord's programmers are Gaming oriented)
bot.on('guildMemberAdd', function (member) {
	    logger.info(member + 'joined!');
	    logger.info(member.id + 'ID!');
	    logger.info(member.username + 'name!');
		logger.info(member.discriminator + 'name!');
		//Run a Check now
		runcheck();
});

//Event fires on a name Change of a User already in our Guild
bot.on('guildMemberUpdate', function (oldMember, newMember) {
	    logger.info(oldMember.username + 'renamed to: ' + newMember.username);
		//Run a Check now
		runcheck();
});

//Event that fires on new messages in the Server (Command)
bot.on('message', function(user, userID, channelID, message, event) {
//    if (message === "!Scammer") {
//        bot.sendMessage({
//            to: channelID,
//            message: "@Moderators"
//        });
//    }
	if (message.lower === "!banhammer") {
		Bannedusers = runcheck();
		logger.debug(Bannedusers)
		if (Bannedusers == "The following User's got"){
			msgback = "Triggered Autoscan - sadly I couldn't find any suspisiouss matches. Could you kindly let someone know?"
		} else {
			msgback = Bannedusers
		}
        bot.sendMessage({
            to: channelID,
            message: msgback
        });
    }
});

//Function to actualy build current user Array's and check for same username's
function runcheck(){
    var Servers = bot.servers;
	logger.silly(Servers);	
	var AllUsers = bot.servers[Servertocheck].members;
	logger.debug("Users:")
	for (var property in AllUsers) {
		if( AllUsers.hasOwnProperty( property ) ) {
		   logger.debug(property + ": " + AllUsers[property])
		}
	}

	var AllRoles = bot.servers[Servertocheck].roles;
	logger.debug("Roles:");
	for (var property in AllRoles) {
		if( AllRoles.hasOwnProperty( property ) ) {
        logger.debug(property + ": " + AllRoles[property])
		}
	}
    //reset Arrays 
	var IDstoprotect = [];
	var Memberstoprotect = [];
	for (var Role in AllRoles) {
		if (RolestoCheck.includes(AllRoles[Role].name)) {
			IDstoprotect.push(AllRoles[Role].id);
		}
	}
	logger.debug("IDs to protect");
	for (var id in IDstoprotect){
		logger.debug(IDstoprotect[id])
	}
	
	logger.debug("add users to memberstoprotect");
	for (var user in AllUsers) {
		for (var Userrole in AllUsers[user]) {
			if (IDstoprotect.includes(AllUsers[user][Userrole])) {
				Memberstoprotect.push(user);
			}
		}
		
	}
	logger.debug("Members to protect:");
	logger.silly(Memberstoprotect.length);

	for (var user in bot.users) {
		if (Memberstoprotect.includes(bot.users[user].id)) {
		Membersnamestoprotect += bot.users[user].username.lower;	
		}
	}

	for (var property in Memberstoprotect) {
    if( Memberstoprotect.hasOwnProperty( property ) ) {
       logger.debug(property + ": " + Memberstoprotect[property]);
		}
	}
	Memberstoban = [];
	tmpstring = "The following User's got";
	var partialmatchfound = false;
	for (var user in AllUsers) {
		var usernameplain = bot.users[user].username;
		logger.debug("checking username: " + usernameplain);
		logger.silly( "Length of username :" + (usernameplain).length);
	//	var usernameconverted = convertInputReverse(usernameplain).lower; //currently there is no fuzzing Lib used
		//check if minimal length is satisfied - if not bail
		if (usernameplain.length > minnamelengthtoprotect){
		logger.debug("checking username: " + usernameplain);
		logger.debug("Member is protected: " + Memberstoprotect.includes(user));
		//Check if user is a protected member by userid - if so bail
		if (Memberstoprotect.includes(user) == false) {
			//Check if username matches (exactly) with protected User
			if (Membersnamestoprotect.includes(usernameplain)) {
				//Check how harsh the checking is - may ignore the discriminator (#numbers) 
				if (includediscriminator) {
					//remember we got a partial match, even if we don't want to ban/kick those users - we may want to warn some users.
					partialmatchfound = true;
					if (warnforpotentialmatch) {
						tmpstring += " Warned - similar Names as protected User:\nID: " + bot.users[user].id + "  Handle: " + bot.users[user].username + "\n"
					}
					if (bot.users[user].username + bot.users[user].discriminator == bot.users[Memberstoprotect.indexOf(user)].username + bot.users[Memberstoprotect.indexOf(user)].discriminator){
							Memberstoban.push(user);
								MembersIDtoban.push(bot.users[user].id);
								logger.info("Punishing User: " + user + " : " +  bot.users[user].username);	
								//ban users
								if (punishaction == "ban"){
									bot.ban(Servertocheck, bot.users[user].id);
									tmpstring += " banned:\nID: " + bot.users[user].id + "  Handle: " + bot.users[user].username + "\n"
								}else {
									//assume kick
									bot.kick(Servertocheck, bot.users[user].id);
									tmpstring += " kicked:\nID: " + bot.users[user].id + "  Handle: " + bot.users[user].username + "\n"
									}
					}			
				} else {
						Memberstoban.push(user);
						MembersIDtoban.push(bot.users[user].id);
						logger.info("Punishing User: " + user + " : " +  bot.users[user].username);	
						//ban users
						if (punishaction == "ban"){
							bot.ban(Servertocheck, bot.users[user].id);
							tmpstring += " banned:\nID: " + bot.users[user].id + "  Handle: " + bot.users[user].username + "\n"
						}else {
							//assume kick
							bot.kick(Servertocheck, bot.users[user].id);
							tmpstring += " kicked:\nID: " + bot.users[user].id + "  Handle: " + bot.users[user].username + "\n"
						}
					}
				}	
			}
		}
	}
	//return our message to interactively display it in case a user triggered a scan (otherwise stay silent)
	return tmpstring
}
