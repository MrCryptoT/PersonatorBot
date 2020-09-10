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
```npm install tesseract.js```

## Configuration

1) Supply your Auth token in auth.json<br>

```RolestoCheck``` Supply the name of Roles to protect<br>
```Servertocheck``` The ID of the Server to protect<br>
```missingrightsnotifytags``` The ID of the Role to notify if a nonprivilidged user call ```!ban```<br>
```tagagrouponmissingrights``` Make sure to disable if you don't want to notify a Role if a nonprivilidged User calls ```!ban```<br>
```ChannelIDtorespondin``` A List (js array) of Channel ID's to listen for commands and to respond in<br>
```staysilentonwrongchannelusedforcommand``` Decides if Bot tells user "Wrong channel" <br><br>
```wrongchanneldescriptionforcommand``` Aforemontioned "Wrong channel" Message <br>
```punishaction``` Ban or Kick the offending user<br>
```knownscamcopypastecontents``` Strings that are known Spam - **be careful with those**, they should be long and make sure to exclude false positives! <br>
```copypastespamprotectionenabled``` Make sure to disable if you don't want to ban users with certain Strings in their messages<br>
```mee6inteagration_cmdclear_enabled``` Print extra Info in Embed about !Clear command of Mee6 (Usefull for heavy spammers) <br>
```deleteafterreaction```  Allows Protected Users to "clear" (Delete) the Bot's messages (NEeds fideling to delete the reporing users command to - could be nice for Workflow of Admins) <br>
```banacceptedreaction``` the Emoji afrementioned <br>
```Reportemoji``` Not Implemented yet (will report the reacted message) <br>
```Reportonemojireaction``` Not Implemented yet (will report the reacted message) <br>
```minnamelengthtoprotect ``` min Username Length to check for impersonation<br>
```includediscriminator``` Decide if you want to include the #1234 numbers in the Namecheck. (false will ban users with the same name, but different discriminator) <br>
```warnforpotentialmatch ``` Currently not used (will warn about potential match in a info channel)

There are more variables to play around with, but above covers the important stuff

2) Invite the Bot to your Server via OAuth generated for your Bot. <br> *(Sorry this bot isn't running for multiple servers - it's supposed to be configured for each Server and run by some Admin of said Server)*


## Run the Bot
```node --max-old-space-size=8192 bot.js```
(--max-old-space-size=8192 is only required on Huge Servers to not run into Memory limitations)

## Screenshots: 
```!ban help``` <br>
![help](https://github.com/MrCryptoT/PersonatorBot/blob/master/img/cmd_help_Output.png)

