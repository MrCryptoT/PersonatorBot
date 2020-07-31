//Grab the legit Mod/Admin Users and protect them from Impersonation
//can be expanded on 
//If someone feels generous, some Coffee donations are never needed, but always appreciated <3 BTC: 1C1zWwmV44vrt4fWxnqa1FPm93kGuFQ6XL

//Approach: 
//Scan for similar Usernames as in specified Roles and if found kick or Ban (depending on Config) 
//For long enough usernames we can also search character by character and calculate the match
//this should be used carefully though as short usernames may match quite quickly (anything under 6 chars is probably overkill)

//Also if the discriminator does not match we may only want to warn instead of banning/kicking
//Same is true for "%"-matches if a username is really close to a protected Member


//Config Area
var RolestoCheck = ['Moderators', 'Admins', 'Trusted Trader']; //Names of Roles to protect
var Servertocheck = "ServerID" //Server ID to protect
var Loglevel = "info" //error: 0,  warn: 1,  info: 2,  http: 3,  verbose: 4,  debug: 5,  silly: 6 - always displays selected level and lower
var minnamelengthtoprotect = 6; //checks will be ignored if username shorter than this (without discriminator)
var includediscriminator = false; //disallow the same name even if discriminator is not the same - if true MrT#1234 and MrT#4321 can both be on the Server even if 1 of them is protected
var warnforpotentialmatch = true; //Warn for potential matchess where name is same but discriminator is different
var commandprefix = "!"; //Mostly for debugging as scanning takes places when users join or rename
var commandnametotriggerscan = "banhammer"; //Mostly for debugging as scanning takes places when users join or renamevar commandnametotriggerscan = "!banhammer"; //Mostly for debugging as scanning takes places when users join or rename
var commandnametoban = "ban" //banning via userid (calling user still needs proper rights)
var missingrightsnotifytags = "<@&455177482581180428>"; //GroupID to Tag if a user with missing rights calls a ban - if enabled make sure thebot is allowed to use the entered tag
//<@id> to tag a User instead of a Role
var tagagrouponmissingrights = true;
var knownscamcopypastecontents = ["Libra just released"] //implement this later for the usual "hey libra released" spam
var copypastespamprotectionenabled = true;


//req's
var Discord = require('discord.io'); //Discord API Library - not too current but works
var logger = require('winston'); //Logger Lib
var auth = require('./auth.json');//Discord Bot Token
var punishaction = "kick" //or "ban" or "warn"

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
	//run a check directly on startup in case the bot was down a while
    runcheck();
});

//Event fire's on new users joining the "guild" (guild = Discord Server - damn discord's programmers are Gaming oriented)
bot.on('guildMemberAdd', function (member) {
	    logger.info(member + 'joined!');
	    logger.info(member.id + 'ID!');
	    logger.info(member.username + 'name!');
		logger.info(member.discriminator + 'name!');
		//Run a Check whenever a new user joins
		runcheck();
});

//Event fires on a name Change of a User already in our Guild
bot.on('guildMemberUpdate', function (oldMember, newMember) {
	    logger.info(oldMember.username + 'renamed to: ' + newMember.username);
		//Run a Check whenever a user changes his name
		runcheck();
});

//Event that fires on new messages in the Server (Command)
bot.on('message', function(user, userID, channelID, message, event) {
	//check if this contains known Spam content 
	//	logger.debug("Roles of calling user:");
			var memberroles = bot.servers[Servertocheck].members[userID].roles;
		//	logger.debug(memberroles);	
				var AllRoles = bot.servers[Servertocheck].roles;
				var IDstoprotect = [];
				for (var Role in AllRoles) {
					if (RolestoCheck.includes(AllRoles[Role].name)) {
						IDstoprotect.push(AllRoles[Role].id);
					}
				}
				userisprotected = false //we assume as protected users are allowed to ban for now - needs improvement.
				for (var role in memberroles) {
				if  (IDstoprotect.includes(memberroles[role])){
					userisprotected = true
			}
	}		
	
	
	if (copypastespamprotectionenabled) {
		for (var knownspam in knownscamcopypastecontents) {
			logger.silly("knownspam in knownscamcopypastecontents:  " + knownscamcopypastecontents[knownspam]);
			if (message.includes(knownspam)) {
				if (!userisprotected){
					//no mercy for spammers - byebye <3 
					usertoban = {
					serverID : Servertocheck,
					userID : userID
					}
						logger.silly("Banning because of known spam");
			//	bot.ban(usertoban);
			}
			}
			
		}
	}
	
	//check if this is a command
	if (message.substring(0, 1) == commandprefix) {
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

	//Additional sinity checks needed: 
		//has the banning user has rights to ban? 
		//is the user already banned? 
		
	//Ban users via Tag or ID if they already left the server 
		if (cmd === commandnametoban) {
		
			
			
				// if (message.author.hasPermission("ADMINISTRATOR")) return logger.debug('Calling USER HAS ADMINISTRATOR PERMISSIONS!')
			//if (message.author.hasPermission("ban")) return logger.debug('Calling USER HAS ban  PERMISSIONS!')
			
			const banReason = args.slice(2);
			logger.silly("entered " + commandnametoban + " command region - cmd recognised!");
			logger.silly('Arg1 ' + args[1]);
			logger.silly('Arg2 ' + args[2]);
			var tagsexist = false;
			usertoban = "";
			
			//See if there was a Tag
			if (args[1].substring(0, 3) == '<@!') {
				logger.silly("we got a tag so ID has other chars in it  -  sanitize");
				usertoban = args[1].substring(3, args[1].length -1);
				logger.silly('User =  ' + usertoban);
				tagsexist = true;
			 } else  {
				 logger.info("No Tags exist for bancommand, ban by ID: " + args[1]);
		  }
		  
		  //no user tagged, assume banning by ID 
		if (tagsexist == false) {
					usertoban = args[1]
		}
		
		if (userisprotected) {
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
				    logger.silly("trying to ban userid : " + usertoban);
					bot.sendMessage({
						to: channelID,
						embed: {
						  color: 0x442691,
						  title: "User Banned!",
						  description: 'Alright, ' + usertoban + ' has been banned for ' + banReason,
						  thumbnail: {
							  url: ""
						  },
						  footer: {
							text: "Reported by: " +user + " Thank you alot!",
						},
					}
                        });	
				// const modlogChannelID = '454523192661245953'
				//	if (modlogChannelID.length !== 0) {
				//		if (client.channels.get(modlogChannelID )) return undefined;
				//		const banComfirmationEmbedModLog = 
				//		client.channels.get(modlogChannelID).send({
				//			embed: {
				//		Author: '**${msg.author.username} Swinged the ban hammer on **' + usertoban.name,
				//		color: 0x442691,
				//		description: '**__A Ban has occoured!__**\n' + '**__Moderator__**: ${user.username}\n' + '**__Rule Breaker__**: ${user.discriminator}\n' + '**__Reason__**: ${reason}\n'
				//			}
				//		});
				//	}	
				} 
			catch (error) {
				bot.sendMessage({
					to: channelID,
					embed: {
					  color: 0x442691,
					  title: "Couldn't Ban",
					  description: 'couldn\'t ban User Sorry! Make sure you supply a correct ID or Tag. \n Also we cannot ban a user twice ;)',
					  thumbnail: {
						  url: ""
					  },
					  footer: {
						text: "If there is a Scammer feel free to let someone know anyways!",
						},
					}
				});
				logger.error("couldn't ban User: " + usertoban );
			 }
			}

			
			}else {
				var missingrightsmessage = 'Thanks for trying to help ' + user + ', however you don\'t have the rights to use this command Sorry.'
				if (tagagrouponmissingrights) {
					missingrightsmessage +=  "\nWe notified " + missingrightsnotifytags + " to take a look when possible."
				} else {
					missingrightsmessage +=  "\nWe noted down the ID for admins to take a look at!";
				}
				bot.sendMessage({
						to: channelID,
						embed: {
						  color: 0x442691,
						  title: "Missing Rights!",
						  description: missingrightsmessage,
						   fields: [{
								name: "Reported User ID:",
								value: "When Admins look at this, please check the following ID: " + usertoban
							  },
							  {
								name: "Syntax:",
								value: "!ban @usernametag reason for the ban \n!ban 412331231244123413 reason for the ban"
							  }
							],
						  thumbnail: {
							  url: ""
						  },
						  footer: {
							text: "Thanks alot " + user + " for helping us in the fight against spammers and scammers! ❤️",
						},
					}
					});
				if (tagagrouponmissingrights) {
					//missingrightsmessage += '\n Could you please take a look ' + missingrightsnotifytags
					bot.sendMessage({
						to: channelID,
						message: "Have a look at this please, reported ID is in the Info-Card: " + missingrightsnotifytags
					});
				}	
			
			  }
        }

			if (cmd === commandnametotriggerscan) {
			Bannedusers = runcheck();
			logger.debug(Bannedusers)
			if (Bannedusers == "The following User's got"){
				msgback = "Triggered Autoscan - sadly I couldn't find any matches. \n If you are sure there is a scammer, could you kindly let someone know?"
				titlestr = "No Impersonators found Sorry!"
			} else {
				msgback = Bannedusers
				titlestr = "Banned - Thx 4 the help!"
			}
			   bot.sendMessage({ to:channelID,
			   embed: {
				  color: 0x442691,
				  title: titlestr,
				  description: msgback,
				  thumbnail: {
					  url: ""
				  },
				  footer: {
					  text: "Reported by: " +user + " Thank you alot!",
					},
				}
			});
		}
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
		Membersnamestoprotect += bot.users[user].username;	
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
					if (bot.users[user].username + bot.users[user].discriminator == bot.users[Memberstoprotect[Membersnamestoprotect.indexOf(bot.users[user].username)]].username + bot.users[Memberstoprotect[Membersnamestoprotect.indexOf(bot.users[user].username)]].discriminator){
						Memberstoban.push(user);
						MembersIDtoban.push(bot.users[user].id);
						logger.info("Punishing User: " + user + " : " +  bot.users[user].username);	
						//ban users
						if (punishaction == "ban"){
							logger.debug(bot.users[user].id);
							logger.debug(user);
							var usertoban = {
							serverID : Servertocheck,
							userID : bot.users[user].id
							}
							bot.ban(usertoban);
							tmpstring += " banned:\nID: " + bot.users[user].id + "  Handle: " + bot.users[user].username + "\n"
						}else {
							//assume kick
							logger.debug(bot.users[user].id);
							logger.debug(user);
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
							logger.debug(bot.users[user].id);
							logger.debug(user);
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
							logger.debug(bot.users[user].id);
							logger.debug(user);
							var usertokick = {
								serverID : Servertocheck,
								userID : bot.users[user].id
								}
								bot.kick(usertokick);
								logger.debug("Boolean value of kick command:");
							logger.debug(bot.kick(Servertocheck, bot.users[user].id));
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
