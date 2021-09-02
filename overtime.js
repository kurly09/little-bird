import {
    json,
    serve,
    validateRequest,
} from "https://deno.land/x/sift@0.1.4/mod.ts";

import {
    DynamoDBClient,
    QueryCommand,
    PutItemCommand,
} from "https://cdn.skypack.dev/@aws-sdk/client-dynamodb?dts";

const client = new DynamoDBClient({
    region: "ap-northeast-2",
    credentials: {
        accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID"),
        secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY"),
    },
});

serve({
    "/": handleRequest,
});

async function handleRequest(request) {

    const { error, body } = await validateRequest(request, {
        GET: {
            params: ["user_id", "overtime"],
        },
        POST: {
            body: ["user_id", "overtime", "type"],
        },
    });
    if (error) {
        return json({ error: error.message }, { status: error.status });
    }

    // Handle POST request.
    if (request.method === "POST") {
        try {
            const {
                $metadata: { httpStatusCode },
            } = await client.send(
                new PutItemCommand({
                    TableName: "overtime",
                    Item: {
                        user_id: { S: body.user_id },
                        overtime: { S: body.overtime },
                        type: { S: body.type },
                    },
                }),
            );

            if (httpStatusCode === 200) {
                return json({ ...body }, { status: 201 });
            }
        } catch (error) {
            console.log(error);
        }

        // If the execution reaches here it implies that the insertion wasn't successful.
        return json({ error: "couldn't insert data" }, { status: 500 });
    }

    // Handle GET request.
    try {
        const { searchParams } = new URL(request.url);

        const user_id = searchParams.get("user_id");
        const overtime = searchParams.get("overtime");

        const result = await client.send(
            new QueryCommand({
                TableName: "overtime",
                ExpressionAttributeValues: {
                    ":user_id": { S: user_id },
                    ":overtime": { S: overtime },
                },
                KeyConditionExpression: "user_id = :user_id and overtime >= :overtime",
            }),
        );

        return json(result.Items);
    } catch (error) {
        console.log(error);
    }

    // We might reach here if an error is thrown during the request to database
    // or if the Item is not found in the database.
    // We reflect both conditions with a general message.
    return json(
        {
            message: "couldn't find the user_id",
        },
        { status: 404 },
    );
}
