# PersonatorBot - prevent impersonation of Admins. <br>

> Currently wrote for a single Server, though that could be expanded.<br>
> Tested on windows, tho should run on any OS that supports node.js.<br>

![successful ban](https://github.com/MrCryptoT/PersonatorBot/blob/master/img/cmd_ban_banned.png)

This Bot has  3 main goals: 
1) Prevent impersonation of members of chosen Roles (f.E moderators/trusted traders groups)
2) Allow manual Ban for usertags or UserIDs via command <br>( accessible to those protected roles . even if that user was never on the server the user gets banned) <br>
2.1) If above command is used by a non protected member it serves as a notify function (printing out the ID to potentially ban and tagging a Role if config allows it) <br>
3) Detect Spam and Scam posts (Libra and co) and Ban those Users within reasonable timespan (<1 Minute is the target for OCR) - this is currently beeing implemented
![unauthd](https://github.com/MrCryptoT/PersonatorBot/blob/master/img/cmd_ban_unauthed_user.png)

## Install Dependencies: 
### Windows
```Install Node.js for your OS```<br>
```git clone https://github.com/MrCryptoT/PersonatorBot.git .```<br>
```cd PersonatorBot```<br>
```npm install winston```<br>
```npm install Woor/discord.io#gateway_v6```<br>

## Configuration

1) Supply your Auth token in auth.json<br>
```RolestoCheck``` Supply the name of Roles to protect<br>
```Servertocheck``` The ID of the Server to protect<br>
```missingrightsnotifytags``` The ID of the Role to notify if a nonprivilidged user call ```!ban```<br>
```knownscamcopypastecontents``` Strings that are known Spam - *be careful with those*, they should be long and make sure to exclude false positives! <br>
```copypastespamprotectionenabled``` Make sure to disable if you don't want to ban users with certain Strings in their messages<br>
```includediscriminator``` Decide if you want to include the #1234 numbers in the Namecheck. (false will ban users with the same name, but different discriminator) <br>
```tagagrouponmissingrights``` Make sure to disable if you don't want to notify a Role if a nonprivilidged User calls ```!ban```<br>

There are more variables to play around with, but above covers the important stuff

2) Invite the Bot to your Server via OAuth generated for your Bot. (Sorry this bot isn't running for multiple servers - it's supposed to be configured for each Server and run by some Admin of said Server) 


## Run the Bot
```node bot.js```


## Screenshots: 
```!ban help``` <br>
![help](https://github.com/MrCryptoT/PersonatorBot/blob/master/img/cmd_help_Output.png)

