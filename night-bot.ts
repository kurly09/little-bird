import {
    json,
    serve,
    validateRequest,
} from "https://deno.land/x/sift@0.1.7/mod.ts";
import dayjs from "https://cdn.skypack.dev/dayjs@1.10.6";
import utc from "https://cdn.skypack.dev/dayjs@1.10.6/plugin/utc";


async function handleRequest(request: Request) {
    // validateRequest() ensures that incoming requests are of methods POST and GET.
    // Slack sends a POST request with a form field named text that contains the
    // information provided by user. We're allowing GET for anyone visiting the
    // endpoint in browser. You can disallow GET for your application as it is
    // not required by Slack.
    const { error } = await validateRequest(request, {
        GET: {},
        POST: {},
    });
    if (error) {
        // validateRequest() generates appropriate error and status code when
        // the request isn't valid. We return that information in a format that's
        // appropriate for Slack but there's a good chance that we will not
        // encounter this error if the request is actually coming from Slack.
        return json(
            // "ephemeral" indicates that the response is short-living and is only
            // shown to user who invoked the command in Slack.
            { response_type: "ephemeral", text: error.message },
            { status: error.status },
        );
    }

    // If a user is trying to visit the endpoint in a browser, let's return a html
    // page instructing the user to visit the GitHub page.
    if (request.method === "GET") {
        return new Response(
            `<body
        align="center"
        style="sans-serif; font-size: 1.5rem;"
      >
        <p>
            야근봇 
        </p>
      </body>`,
            {
                headers: {
                    "content-type": "text/html; charset=UTF-8",
                },
            },
        );
    }

    try {
        const formData = await request.formData();
        // The text after command (`/weather <text>`) is passed on to us by Slack in a form
        // field of the same name in the request.
        if (!formData.has("text")) {
            return json(
                { response_type: "ephemeral", text: "form field `text` not provided" },
                { status: 400 },
            );
        }

        // We gather location name from `text` field and construct the
        // request URL to fetch weather information.
        const flag = formData.get("text")!.toString().trim();
        const userId = formData.get("user_id")!.toString().trim();
        dayjs.extend(utc);
        const current = dayjs().utc().utcOffset(9).format();

        let flagCode = '';
        if (flag === '시작') {
            flagCode = 'BEGIN';
        } else if ((flag === '종료')) {
            flagCode = 'END';
        }

        console.log(`${userId}, ${current}, ${flagCode}`);

        if (flagCode !== '') {
            await fetch('https://overtime.deno.dev/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId,
                    overtime: current,
                    type: flagCode
                }),
            });
        }

        // This is the response that's returned when the command is invoked.
        // The layout uses Slack's Block Kit to present information. You
        // can learn more about it here: https://api.slack.com/block-kit.
        return json({
            response_type: "in_channel",
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: [
                            `<@${userId}> ${flag}`
                        ].join("\n"),
                    },
                },
            ],
        });
    } catch (error) {
        // If something goes wrong in the above block, let's log the error
        // and return a generic error to the user.
        console.log(error);
        return json(
            {
                response_type: "ephemeral",
                text: "Error fetching the results. Please try after sometime.",
            },
            { status: 500 },
        );
    }
}

// Call handleRequest() on requests to "/" path.
serve({
    "/overtime": handleRequest,
});