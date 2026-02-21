const { createCanvas } = require("canvas");


// Dimensions for the image
const width = 320;
const height = 320;

exports.generateAvatar = (text) => {

    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");

    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, width, height);

    // Set the style of the test and render it to the canvas
    context.font = "bold 70pt 'PT Sans'";
    context.textAlign = "center";
    context.fillStyle = "#0D6EFD";
    // 600 is the x value (the center of the image)
    // 170 is the y (the top of the line of text)
    context.fillText(text, 170, 200);

    const buffer = canvas.toBuffer("image/png");

    return buffer;
}