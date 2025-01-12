const path = require('path');
const fs = require('fs'); // For file operations
const express = require('express');
const multer = require('multer'); // For file uploads
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const { format } = require('date-fns');
const router = express.Router();


// Initialize Google Generative AI with API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Define a schema for structured JSON response tailored for force-directed graphs
const schema = {
    description: "Nodes and links for a force-directed graph extracted from an image",
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

// Configure the model with schema and response configuration
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
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

const uploadDir = path.join(__dirname, "..", "uploads");
//create /uploads directory if not exist
if (!fs.existsSync(uploadDir))
{
    console.log("Creating uploads directory");

    fs.mkdirSync(uploadDir);
}

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) =>
    {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) =>
    {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Helper function to convert image file to Generative AI compatible format
function fileToGenerativePart(filePath, mimeType)
{
    return {
        inlineData: {
            data: fs.readFileSync(filePath).toString("base64"),
            mimeType,
        },
    };
}

// Function to process API response and extract nodes and links
function processGraphData(responseText)
{
    try
    {
        const responseData = JSON.parse(responseText);
        const nodes = responseData.nodes || [];
        const links = responseData.links || [];

        console.log('Extracted Nodes:', nodes);
        console.log('Extracted Links:', links);

        return { nodes, links };
    } catch (error)
    {
        console.error('Error processing graph data:', error);
        return { nodes: [], links: [] };
    }
}



// Route to render the upload page
router.get('/lab', (req, res) =>
{
    res.sendFile(path.join(__dirname, "..", "views", "brainstorm3", "lab.html"));
});

// Route to handle image upload and processing
router.post('/generate-fdg-data', upload.single('image'), async (req, res) =>
{
    try
    {
        const brainstormFocus = req.body.brainstormFocus;
        console.log(brainstormFocus);

        const filePath = req.file.path; // Path to the uploaded file
        const filename = req.file.filename; // Name of the uploaded file
        console.log(filename);

        const mimeType = req.file.mimetype; // Mime type of the uploaded file

        const prompt = `Extract nodes and links for a force-directed graph from the image. ${brainstormFocus} `;
        const imagePart = fileToGenerativePart(filePath, mimeType);

        // Generate content with schema enforcement
        const result = await model.generateContent([prompt, imagePart]);

        // Extract nodes and links from structured JSON response
        const { nodes, links } = processGraphData(result.response.text());

        // Respond with structured graph data
        res.json({ nodes, links });
    } catch (error)
    {
        console.error('Error generating structured graph data from image:', error);
        res.status(500).send('An error occurred while processing the image.');
    } finally
    {
        //clean up the uploaded file
        if (req.file && req.file.path)
        {
            fs.unlinkSync(req.file.path);
        }
    }
});



const streamData = {};
router.post("/start-stream", express.json(), (req, res) =>
{
    const sessionId = req.body.sessionId || "default-session";

    streamData[sessionId] = {
        ideas: req.body.ideas || [],
        brainstormFocus: req.body.brainstormFocus || ""
    };

    console.log("ideas", streamData[sessionId].ideas);
    console.log("brainstormFocus", streamData[sessionId].brainstormFocus);

    if (!streamData[sessionId].ideas.length)
    {
        return res.status(400).send("No ideas list provided.");
    }
    res.status(200).send("Stream initialized.");
});

router.get("/llm-stream", async (req, res) =>
{
    const sessionId = req.query.sessionId || "default-session";
    const sessionData = streamData[sessionId];

    if (!sessionData || !sessionData.ideas.length || !sessionData.brainstormFocus)
    {
        return res.status(400).send("No initialized session data found.");
    }

    const prompt = `relate the following: [${sessionData.ideas}]. ${sessionData.brainstormFocus}`;
    console.log("prompt", prompt);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try
    {
        const result = await model2.generateContentStream(prompt);
        for await (const chunk of result.stream)
        {
            const chunkText = chunk.text();
            res.write(`data: ${chunkText}\n\n`);
        }
        res.end();
    } catch (error)
    {
        console.error("Error during streaming:", error);
        res.write(`data: Error: ${error.message}\n\n`);
        res.end();
    }
});


router.get("/load-image/:lab_id", (req, res) =>
{
    const lab_id = req.params.lab_id;

    const sql = "SELECT * FROM brainstorm3s WHERE id = ?";
    con.query(sql, [lab_id], (err, result) =>
    {
        if (err)
        {
            res.send(err);
        }
        else
        {
            console.log(result);
            res.json({ image: result[0].image });
        }
    })
});

router.get("/images/:filename", (req, res) =>
{
    const uploadsFolder = path.join(__dirname, "..", "uploads"); // Path to your uploads folder
    const fileName = req.params.filename; // Extract file name from the request

    const filePath = path.join(uploadsFolder, fileName);

    res.sendFile(filePath, (err) =>
    {
        if (err)
        {
            console.error(err);
            res.status(404).send('Image not found');
        }
    });
});



router.post('/download-pdf', (req, res) =>
{
    const ai_text = req.body.ai_text;

    const project = {
        lab_name: "Active Brainstorming: Brainstorm 2",
        created_at: format(new Date(), 'MM-dd-yy HH:mm:ss'),
        ai_text: ai_text,
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

    // Finalize the PDF and send it to the client
    doc.end();
});

module.exports = router;
