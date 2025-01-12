const path = require("path");
const axios = require("axios");
const express = require("express");
const crypto = require('crypto');
const { format } = require('date-fns');
require("dotenv").config();
const PDFDocument = require('pdfkit');

const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
const { log } = require("console");
const { notEqual } = require("assert");
const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const schema = {
    description:
        "Nodes and links for a force-directed graph extracted from an array of ideas",
    type: SchemaType.OBJECT,
    properties: {
        nodes: {
            type: SchemaType.ARRAY,
            description: "List of nodes representing ideas from the image",
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    id: { type: SchemaType.INTEGER, description: "Unique node ID" },
                    label: { type: SchemaType.STRING, description: "Label for the node" },
                    info: { type: SchemaType.STRING, description: "Additional information about the node" }
                },
                required: ["id", "label", "info"]
            },
        },
        links: {
            type: SchemaType.ARRAY,
            description: "List of links between nodes",
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    source: { type: SchemaType.INTEGER, description: "Source node ID" },
                    target: { type: SchemaType.INTEGER, description: "Target node ID" }
                },
                required: ["source", "target"]
            },
        }
    },
    required: ["nodes", "links"],
};
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
    },
});

//this model object is used to generate a text response that relates ideas. 
//This is because the first model generate a response in a json format that is not suitable for the user interface
const model2 = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
});

function processGraphData(responseText)
{
    try
    {
        const responseData = JSON.parse(responseText);
        const nodes = responseData.nodes || [];
        const links = responseData.links || [];

        return { nodes: nodes, links: links };

    }
    catch (error)
    {
        console.error(error);
        return { nodes: [], links: [] };
    }
}

router.get("/lab", (req, res) =>
{
    res.sendFile(path.join(__dirname, "..", "views", "brainstorm2", "lab.html"));
});

router.post("/generate-fdg-data", async (req, res) =>
{
    try
    {
        const ideas_list = req.body.ideas;
        const brainstormFocus = req.body.brainstormFocus;
        console.log(ideas_list);

        const prompt = `Brainstorm using the given array of ideas. Extract nodes and links for a force-directed graph from the following array of ideas: [${ideas_list.join(", ")}]. add links to relate these ideas. ${brainstormFocus}`;

        // const prompt = `Given the following array of ideas: [${ideas_list.join(", ")}], brainstorm their relationships and interconnectedness. 
        //                 Identify key nodes representing each idea and determine meaningful links between them to illustrate their connections in a force-directed graph. 
        //                 Extract essential information for each node, such as unique IDs, labels, and additional context, and define clear links specifying source and target node IDs to represent their relationships.`;

        const result = await model.generateContent(prompt);
        const { nodes, links } = processGraphData(result.response.text());

        res.json({ nodes, links });
    }
    catch (err)
    {
        console.error(err);
        res.json({ nodes: [], links: [] });
    }
});

const streamData = {};
router.post('/start-stream', express.json(), (req, res) =>
{
    const sessionId = req.body.sessionId || 'default';
    streamData[sessionId] = {
        ideas: req.body.ideas || [],
        brainstormFocus: req.body.brainstormFocus || 'look for relationship',
    };

    res.status(200).send('Stream initialized.');
});

router.get('/llm-stream', async (req, res) =>
{
    const sessionId = req.query.sessionId || 'default';
    const { ideas, brainstormFocus } = streamData[sessionId] || { ideas: [], brainstormFocus: 'look for relationship' };

    console.log("ideas", ideas);
    console.log("focus", brainstormFocus);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try
    {
        const prompt = `relate the following: ${ideas}. ${brainstormFocus}`;
        console.log(prompt);

        //using the second model to generate a text response
        const result = await model2.generateContentStream(prompt);

        for await (const chunk of result.stream)
        {
            const chunkText = chunk.text();
            res.write(`data: ${chunkText}\n\n`);
        }

        res.end(); // Close the connection
    } catch (error)
    {
        console.error("Error during streaming:", error);
        res.write(`data: Error: ${error.message}\n\n`);
        res.end();
    }
});


router.post('/download-pdf', (req, res) =>
{
    const ai_text = req.body.ai_text;
    const note = req.body.note;

    const project = {
        lab_name: "Passive Brainstorming: Brainstorm3",
        created_at: format(new Date(), 'MM-dd-yy HH:mm:ss'),
        ai_text: ai_text,
        note: note
    };

    // Create a new PDF document
    const doc = new PDFDocument();

    // Set the response headers to force the download of the PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=project.pdf`);

    // Pipe the PDF document to the response
    doc.pipe(res);

    // Add blue background to the entire page
    doc.rect(0, 0, 612, 200).fill('#1E40AF'); // Filling the page with a blue color

    // Add the logo image
    const logoPath = path.join(__dirname, '..', 'public', 'img', 'logo-bsai-final.png'); // Assuming logo is stored in the 'public' directory
    doc.image(logoPath, { width: 75, align: 'center' }); // Add logo with a fixed width of 100px
    doc.moveDown(2); // Move down a bit after the logo

    // Add header for the website
    doc.fontSize(18).fillColor('white').text('Brainstorm AI', { align: 'center' });
    doc.moveDown(1); // Adding space after the header

    // Add the lab name and creation date in white color
    doc.fontSize(16).fillColor('white').text(`Lab Name: ${project.lab_name}`, { align: 'center' });
    doc.fontSize(12).fillColor('white').text(`Date Created: ${project.created_at}`, { align: 'center' });
    doc.moveDown(2); // Adding space before the content

    doc.fontSize(12).fillColor('black').text('AI Generated Text:', { underline: true });
    doc.fontSize(10).fillColor('black').text(project.ai_text);
    doc.moveDown(2); // Adding space before the next section

    doc.fontSize(12).fillColor('black').text('Note Texts:', { underline: true });
    doc.fontSize(10).fillColor('black').text(project.note);

    // Finalize the PDF and send it to the client
    doc.end();
});

module.exports = router;
