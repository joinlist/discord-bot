const fs = require('fs')
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const fetch = require("isomorphic-fetch");

const {
  Client,
  GatewayIntentBits,
  Collection,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  TextChannel,
  ChannelType,
  Events,
} = require("discord.js");
const db = require("./utils/db");

const getProject2 = (idOrSlug) => {
  return fetch(`https://www.joinlist.me/api/v2/projects/${idOrSlug}`).then(
    (r) => r.json()
  );
};

const getProject = async ({ projectId, select = "id, name, slug" }) => {
  return (
    await db.from("Project").select(select).match({ id: projectId }).single()
  )?.data;
};

const getWinners = async (projectId) => {
  const { data } = await db.from("Entry").select("discordUserId").match({
    projectId,
    winner: true,
  });

  return data?.map(({ discordUserId }) => discordUserId)?.filter(Boolean) || [];
};

// Create a new client instance
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Loading commands from the commands folder
const commands = [];
const commandFiles = fs
  .readdirSync("./commands")
  .filter((file) => file.endsWith(".js"));

// Loading the token from .env file
const dotenv = require("dotenv");
const envFILE = dotenv.config();
const TOKEN = process.env["TOKEN"];

// Edit your TEST_GUILD_ID here in the env file for development
const TEST_GUILD_ID = process.env["TEST_GUILD_ID"];

// Creating a collection for commands in client
// @ts-ignore
client.commands = new Collection();

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  // @ts-ignore
  commands.push(command.data.toJSON());
  // @ts-ignore
  client.commands.set(command.data.name, command);
}

// When the client is ready, run this code (only once)
client.once("ready", async (instance) => {
  console.log("Ready!");
  // Registering the commands in the client
  const CLIENT_ID = client?.user?.id;
  const rest = new REST({
    version: "9",
  }).setToken(TOKEN);

  /**
   * Create a role
   */
  // try {
  //   const guild = await client.guilds.fetch("1002460056366886943");
  //   const role = await guild.roles.create({
  //     name: "Super Cool Blue People",
  //     color: Colors.Blue,
  //     reason: "we needed a role for Super Cool People",
  //     position: 1,
  //     // unicodeEmoji: "🤖", // Requires boosts
  //   });
  //   console.log(role);
  // } catch (error) {
  //   console.error(error);
  // }

  /**
   * Assign role to a specific user
   *
   * Remember, we can't assign a role that is higher than the bot's role
   */
  // try {
  //   const guild = await client.guilds.fetch("1002460056366886943");
  //   const member = await guild.members.fetch("768333320177844245");
  //   member.roles.add("1070294158935339099");
  // } catch (error) {
  //   console.error(error);
  // }

  /**
   * Create a channel
   *
   * Docs: https://discord.js.org/#/docs/discord.js/main/class/GuildManager?scrollTo=create
   */
  // try {
  //   const guild = await client.guilds.fetch("1002460056366886943");

  //   const res = await guild.channels.create({
  //     name: "hello",
  //     type: ChannelType.GuildText,
  //   });
  //   console.log(res.id);
  // } catch (e) {
  //   console.error(e);
  // }

  /**
   * List role names
   */
  // try {
  //   const rolesMustHave = ["1070294158935339099"];
  //   const guild = await client.guilds.fetch("1002460056366886943");
  //   const channel = await guild.channels.fetch("1002460057222520955");
  //   const roles = await guild.roles.fetch();
  //   // list role names
  //   //console.log(roles.map((x) => x.name));
  // } catch (e) {
  //   console.error(e);
  // }

  /**
   * Announce the project to the discord channel
   */
  try {
  } catch (e) {}

  /**
   * Listen for button clicks
   */
  client.on(Events.InteractionCreate, (interaction) => {
    if (!interaction.isButton()) return;
    const discordUserId = interaction.user.id;
    const channelId = interaction.channelId;
    const serverId = interaction.guildId;
    const embed = interaction.message.embeds[0];
    const slug = embed?.url?.split("/").pop();
    console.log(
      `User ${discordUserId} clicked button in channel ${channelId} for slug ${slug}`
    );
  });

  /**
   * Process the Broadcast
   */
  (async () => {
    db.from("Broadcast")
      .on("INSERT", async (payload) => {
        const { schema, table, eventType, new: broadcast } = payload;
        const { type, provider, metadata } = broadcast;

        try {
          /**
           * Errors is either null or an array of errors
           */
          const errors = payload.errors;

          if (errors) {
            throw new Error(errors);
          }

          console.log("Processing broadcast", broadcast);

          const channelId = metadata.channelId;
          const projectId = metadata.projectId;
          const projectSlug = metadata.projectSlug;
          const channel = client.channels.cache.get(channelId);

          if (!channel) {
            console.error("Channel not found");
            return;
          }

          if (!type) {
            console.error("Type not found");
            return;
          }

          if (!provider) {
            console.error("Provider not found");
            return;
          }

          if (provider !== "discord") {
            console.error("Provider is not discord");
            return;
          }

          switch (type) {
            case "assign_role":
              console.log("Processing role assignment");
            case "announce_winners":
              console.log("Processing winner announcement");
              console.log("Processing winner announcement");

              /**
               * Get project name
               */
              const projectName = (await getProject({ projectId }))?.name;

              if (!channelId) {
                return console.log(
                  `No channel id found for projectId ${projectId}!`
                );
              }

              console.log(
                `Got channelId: ${channelId} from project: ${projectName}`
              );

              /**
               * Returns list of discord user ids that are winners
               */
              const entries = await getWinners(projectId);

              if (entries?.length === 0) {
                return console.log("No winners found");
              }

              console.log(
                `Got entries from project: ${projectName} : ${entries?.length}`
              );

              // Build the message using the list of winners and pass it in the channel
              const builtMessage = entries?.map((x) => `<@${x}>`).join(", ");

              // Send the message
              channel.send(`Winners for ${projectName}: ${builtMessage}`);

              console.log(
                `Sent winners for ${projectName} : ${entries.length}`
              );
            case "announce_project":
              console.log("Processing project announcement");

              const { data: project } = await getProject2(projectSlug);

              if (!project) {
                console.error("Project not found");
                return;
              }

              /**
               * Get the author of the project
               */
              const userId = project?.userId;
              const twitterProfile = (
                await db
                  .from("Account")
                  .select("*")
                  .match({ userId, provider: "twitter" })
                  .single()
              )?.data?.profile;

              const { profile_image_url_https, name } = twitterProfile || {};

              /**
               * Get the project's requirements
               */
              const domain = "https://www.joinlist.me";
              const requirements = project?.requirements;
              const requriementsSolana = requirements?.solana;
              const requriementsContracts = requirements?.contracts;
              const contractsMustOwn = requriementsContracts?.map(
                (x) => x.name
              );

              const requriementsDiscord = requirements?.discord;
              const discordEnabled = requriementsDiscord?.connect;
              const discordServerLabel = requriementsDiscord?.serverLabel;
              const discordRoleLabel = requriementsDiscord?.roleLabel;
              const discordServerUrl = requriementsDiscord?.serverUrl;

              const requriementsTwitter = requirements?.twitter;
              const twitterEnabled = requriementsTwitter?.connect;
              const twitterAccountsToFollow = requriementsTwitter?.follow;
              const twitterTweetToRetweetAndLike =
                requriementsTwitter?.tweetUrl;

              const requriementBalance = requirements?.balance;
              const balanceEnabled = requriementBalance?.enabled;
              const balanceQuantity = requriementBalance?.quantity;
              const balanceChainType = requriementBalance?.chain;
              const questionText = project?.questionText;
              const accentColor = project.themeCustom?.accentColor;
              const mintDate = project?.mintDate;
              const mintSupply = project?.mintSupply;
              const projectWebsite = project.website;
              const endAt = project?.endAt;
              // Make the date read like 2 days, or 2 hours without using moment
              // the date could be days weeks or months away or hours away
              // so we need to calculate the difference
              const now = new Date();
              const endAtDateObj = new Date(endAt);
              const diff = Math.abs(endAtDateObj.getTime() - now.getTime());
              const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
              const diffHours = Math.ceil(diff / (1000 * 60 * 60));
              const diffMinutes = Math.ceil(diff / (1000 * 60));
              const diffSeconds = Math.ceil(diff / 1000);
              const timeLeft =
                diffDays > 1 ? `${diffDays} days` : `${diffHours} hours`;

              // create a human readable date like Thur 2 Feb, 16:00
              const endAtDate = new Date(endAt).toLocaleString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "numeric",
                minute: "numeric",
              });

              // this is the form
              // addressRequired: true,
              // emailRequired: true,
              // nameRequired: true,
              // phoneRequired: true,
              // if any of the above are true, then the form is enabled
              // if any of them are null, then the form is disabled
              // if all of them are false, then the form is disabled
              const formEnabled =
                project?.addressRequired ||
                project?.emailRequired ||
                project?.nameRequired ||
                project?.phoneRequired;

              /**
               * Build the requirements text
               */
              let requirementsText = "";
              if (discordEnabled) {
                requirementsText += `● Must be a member of the [${discordServerLabel}](${discordServerUrl}) Discord server`;
                requirementsText += `\n`;
              }
              if (discordRoleLabel) {
                requirementsText += `● Must have the role ${discordRoleLabel}`;
                requirementsText += `\n`;
              }
              if (twitterEnabled) {
                const twitterAccountsToFollowUrls =
                  twitterAccountsToFollow?.map(
                    (x) => `[@${x}](https://twitter.com/${x})`
                  );
                requirementsText += `● Follow ${twitterAccountsToFollowUrls?.join(
                  ", "
                )}`;
                requirementsText += `\n`;
              }
              if (twitterTweetToRetweetAndLike) {
                requirementsText += `● Liked and retweeted [this tweet](${twitterTweetToRetweetAndLike})`;
                requirementsText += `\n`;
              }
              if (balanceEnabled) {
                requirementsText += `● Required ${balanceQuantity} ${balanceChainType} balance`;
                requirementsText += `\n`;
              }
              if (contractsMustOwn) {
                requirementsText += `● Owns ${contractsMustOwn?.join(", ")}`;
                requirementsText += `\n`;
              }
              if (questionText) {
                requirementsText += `● Answered the question: "${questionText}" on the [Joinlist form](${domain}/${projectSlug})`;
                requirementsText += `\n`;
              }
              if (formEnabled) {
                requirementsText += `● Complete the [Joinlist form](${domain}/${projectSlug})`;
                requirementsText += `\n`;
              }

              /**
               * Build the fields for project details
               */
              const fields = [];
              if (mintDate) {
                fields.push({
                  name: "Mint Date",
                  value: mintDate,
                  inline: true,
                });
              }
              if (mintSupply) {
                fields.push({
                  name: "Mint Supply",
                  value: mintSupply,
                  inline: true,
                });
              }
              if (projectWebsite) {
                fields.push({
                  name: "Website",
                  value: projectWebsite,
                  inline: true,
                });
              }
              if (endAt) {
                fields.push({
                  name: "Ends at",
                  value: `${endAtDate}. ${timeLeft} from now`,
                  inline: true,
                });
              }

              const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setLabel("Go to project")
                  .setStyle(ButtonStyle.Link)
                  .setURL(`https://www.joinlist.me/${project.slug}`)
              );

              /**
               * Build the embed
               */
              const embed = new EmbedBuilder()
                .setAuthor({
                  name,
                  iconURL: profile_image_url_https,
                })
                .setThumbnail(project.image)
                .setColor(0x0099ff)
                .setTitle(project?.name)
                .setURL(`${domain}/${projectSlug}`)
                .setDescription(
                  `
                **Description**
                ${project?.description}
                
                **Requirements**
                ${requirementsText}
                `
                )
                .addFields({ name: "\u200B", value: "\u200B" }, ...fields, {
                  name: "\u200B",
                  value: "\u200B",
                })
                .setImage(project?.bannerImage || project.image);

              const join = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId("primary")
                  .setLabel("Register")
                  .setStyle(ButtonStyle.Primary)
              );

              /**
               * Send the embed and button
               */
              channel.send({
                embeds: [embed],
                components: [row],
              });

              console.log(`Sent raffle announcement for ${project.name}`);
            case "mint_reminder":
              console.log("Processing mint reminder");
            case "test":
              console.log("Processing test");

            //(channel).send("Test");
            default:
              console.log("Unknown event type");
          }
        } catch (error) {
          console.log(error);

          // TODO: ping my telegram bot
        }
      })
      .subscribe();
  })();

  /**
   * Registering the commands
   */
  (async () => {
    try {
      if (!TEST_GUILD_ID) {
        await rest.put(Routes.applicationCommands(CLIENT_ID), {
          body: commands,
        });
        console.log("Successfully registered application commands globally");
      } else {
        await rest.put(
          Routes.applicationGuildCommands(CLIENT_ID, TEST_GUILD_ID),
          {
            body: commands,
          }
        );
        console.log(
          "Successfully registered application commands for development guild"
        );
      }
    } catch (error) {
      if (error) console.error(error);
    }
  })();
});

client.on("interactionCreate", async (interaction) => {
  //if (!interaction.isCommand()) return
  // @ts-ignore
  const command = client?.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (error) {
    if (error) console.error(error);
    // @ts-ignore
    await interaction.reply({
      content: "There  error while executing this command!",
      ephemeral: true,
    });
  }
});

client.on("roleCreate", async (role) => {
  console.log("roleCreate", role);
  console.log(role.iconURL);
});

client.on("roleUpdate", async (oldRole, newRole) => {
  console.log("roleUpdate", oldRole, newRole);
  console.log(JSON.stringify(oldRole));
  //console.log(newRole.guild.iconURL())
});

client.on("roleDelete", async (role) => {
  console.log("roleDelete", role);
});

// Login to Discord with your client's token
client.login(TOKEN);
