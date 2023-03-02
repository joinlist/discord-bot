const fs = require("fs");
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
  //   const guild = await client.guilds.fetch("1002460056366886943");
  //   const channel = await guild.channels.fetch("1002460057222520955");
  //   const roles = await guild.roles.fetch();
  //   // list role names
  //   console.log(roles.map((x) => x.name));
  // } catch (e) {
  //   console.error(e);
  // }

  // /**
  //  * List channel names
  //  */
  // try {
  //   const guild = await client.guilds.fetch("1002460056366886943");
  //   const channels = await guild.channels.fetch();
  //   // list channel names
  //   console.log(channels.map((x) => x.name));
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
          const roleId = metadata.roleId;
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
            case "announce_winners":
              try {
                console.log("Processing winner announcement");

                /**
                 * Assign role to a specific user if that setting is enabled
                 */

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
              } catch (e) {
                console.error(e);
              }
              break;
            case "announce_project":
              try {
                console.log(`${projectSlug}: Processing project announcement`);

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
                if (contractsMustOwn && contractsMustOwn.length > 0) {
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
                 * Prepend **Requirements** to the requirements text if there are any
                 */
                if (requirementsText) {
                  requirementsText = `**Requirements**\n${requirementsText}`;
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
                    .setLabel("Go to page")
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://www.joinlist.me/${project.slug}`)
                );

                /**
                 * Build the embed
                 */
                console.log(`${projectSlug}: Building embed`);
                const embed = new EmbedBuilder()
                  .setAuthor({
                    name: name || "Joinlist",
                    iconURL:
                      profile_image_url_https ||
                      "https://www.joinlist.me/joinlist-dark.png",
                  })
                  .setThumbnail(
                    project.image || "https://www.joinlist.me/og1.jpg"
                  )
                  .setColor(0x0099ff)
                  .setTitle(project?.name || "Untitled")
                  .setURL(`${domain}/${projectSlug}`)
                  .setDescription(
                    `
                **Description**
                ${project?.description || "No description"}
                
                ${requirementsText || ""}
                `
                  )
                  .addFields({ name: "\u200B", value: "\u200B" }, ...fields, {
                    name: "\u200B",
                    value: "\u200B",
                  })
                  .setImage(
                    project?.bannerImage ||
                      project.image ||
                      "https://www.joinlist.me/og1.jpg"
                  );

                const join = new ActionRowBuilder().addComponents(
                  new ButtonBuilder()
                    .setCustomId("primary")
                    .setLabel("Register")
                    .setStyle(ButtonStyle.Primary)
                );

                /**
                 * Send the embed and button
                 */
                let content = "";
                if (roleId) {
                  content = `<@&${roleId}>`;
                }
                console.log(`${projectSlug}: Sending embed`);
                channel.send({
                  content: `${content}`,
                  embeds: [embed],
                  components: [row],
                });
                console.log(`${projectSlug}: Sent raffle announcement`);
              } catch (e) {
                console.error(e);
              }
              break;
            case "mint_reminder":
              try {
                console.log("Processing mint reminder");
              } catch (e) {
                console.error(e);
              }
              break;
            case "test":
              try {
                console.log("Processing test");
                channel.send("Test");
              } catch (e) {
                console.error(e);
              }
              break;
            default:
              console.log("Unknown event type");
              break;
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

/**
 * Handle role mutations
 *
 * Update/inserts the database with the latest roles
 */
const handleRoleMutation = async (guild) => {
  // guild could not exist here, so we need to return early
  if (!guild.available) {
    return;
  }

  const roles = await guild.roles.fetch();

  const rolesToSave = roles.map((role) => {
    return {
      roleId: role.id,
      type: role.type,
      name: role.name,
      color: role.color,
      hoist: role.hoist,
      position: role.position,
      managed: role.managed,
      mentionable: role.mentionable,
      serverId: role.guild.id,
      updatedAt: new Date().toISOString(),
    };
  });

  const res = await db.from("DiscordRole").upsert(rolesToSave, {
    onConflict: ["roleId", "serverId"],
  });

  return res;
};

/**
 * Handle channel mutations
 */
const handleChannelMutation = async (guild) => {
  // guild could not exist here, so we need to return early
  if (!guild.available) {
    return;
  }

  const channels = await guild.channels.fetch();
  const channelsToSave = channels.map((channel) => ({
    serverId: channel.guild.id,
    channelId: channel.id,
    name: channel.name,
    type: channel.type,
    position: channel.position,
    parentId: channel.parentId,
    description: channel.topic || null,
    updatedAt: new Date().toISOString(),
  }));

  const res = await db.from("DiscordChannel").upsert(channelsToSave, {
    onConflict: ["channelId", "serverId"],
  });

  return res;
};

client.on("roleCreate", async (role) => {
  try {
    console.log("roleCreate");
    const { error } = await handleRoleMutation(role.guild);
    if (error) {
      console.log(`Error handling role mutation in roleCreate`, error);
      return;
    }
    console.log(`roleCreate done`);
  } catch (e) {
    console.log(`Error in roleCreate: ${e.message}`);
  }
});

client.on("roleUpdate", async (oldRole, newRole) => {
  try {
    console.log("roleUpdate");
    const { error } = await handleRoleMutation(newRole.guild);
    if (error) {
      console.log(`Error handling role mutation in roleUpdate`, error);
      return;
    }
    console.log(`roleUpdate done`);
  } catch (e) {
    console.log(`Error in roleUpdate: ${e.message}`);
  }
});

client.on("roleDelete", async (role) => {
  try {
    console.log("roleDelete");
    await db.from("DiscordRole").delete().eq("roleId", role.id);
    const { error } = await handleRoleMutation(role.guild);
    if (error) {
      console.log(`Error handling role mutation in roleDelete`, error);
      return;
    }
    console.log(`roleDelete done`);
  } catch (e) {
    console.log(`Error in roleDelete: ${e.message}`);
  }
});

// /**
//  * Listen to channel mutations
//  */
client.on("channelCreate", async (channel) => {
  try {
    console.log("channelCreate");
    const { error } = await handleChannelMutation(channel.guild);
    if (error) {
      console.log(`Error handling channel mutation in channelCreate`, error);
      return;
    }

    console.log(`channelCreate done`);
  } catch (e) {
    console.log(`Error in channelCreate: ${e.message}`);
  }
});

client.on("channelUpdate", async (oldChannel, newChannel) => {
  try {
    console.log("channelUpdate");
    const { error } = await handleChannelMutation(newChannel.guild);
    if (error) {
      console.log(`Error handling channel mutation in channelUpdate`, error);
      return;
    }
    console.log(`channelUpdate done`);
  } catch (e) {
    console.log(`Error in channelUpdate: ${e.message}`);
  }
});

client.on("channelDelete", async (channel) => {
  try {
    console.log("channelDelete");
    await db.from("DiscordChannel").delete().eq("channelId", channel.id);
    const { error } = await handleChannelMutation(channel.guild);
    if (error) {
      console.log(`Error handling channel mutation in channelDelete`, error);
      return;
    }
    console.log(`channelDelete done`);
  } catch (e) {
    console.log(`Error in channelDelete: ${e.message}`);
  }
});

/**
 * Listen to guild mutations
 *
 * Triggers when the bot joins a new guild
 */
client.on("guildCreate", async (guild) => {
  try {
    console.log(
      `Joined a new guild: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`
    );
    const { error: errorChannel } = await handleChannelMutation(guild);
    const { error: errorRole } = await handleRoleMutation(guild);
    if (errorChannel) {
      console.log(
        `Error handling channel mutation in guildCreate`,
        errorChannel
      );
    }
    if (errorRole) {
      console.log(`Error handling role mutation in guildCreate`, errorRole);
    }
    console.log(`guildCreate done`);
  } catch (error) {
    console.error(`Something went wrong when joining a new guild`, error);
  }
});

// Login to Discord with your client's token
client.login(TOKEN);
