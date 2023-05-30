const fileInput = document.getElementById("fileinput");
let dropbox = document.getElementById("dropbox");


dropbox.addEventListener("dragenter", drag, false);
dropbox.addEventListener("dragover", drag, false);
dropbox.addEventListener("drop", dropProcess, false);
fileInput.addEventListener("input", fileProcess, false);

function drag(e) {
	e.stopPropagation();
	e.preventDefault();
}

function dropProcess(e) {
	drag(e);
	new DataTransfer();
	const dt = e.dataTransfer;
	const files = dt.files;
	for (let i = 0; i < files.length; i++) {
		deserialiseData(files[i]);
	}
}

function fileProcess(e) {
	for (let i = 0; i < this.files.length; i++) {
	deserialiseData(this.files[i]);
	}
}

// probably should figure out how to better handle this, to make it reusable for other converters (if any)
function deserialiseData(inputFile) {
	if (inputFile.size < 48) {
		// fail if too small
		alert("file too small (" + inputFile.size + " < 48)");
	} else {
		if (inputFile.size > 48) {
			// let the user convert if too big
			if (!confirm("file too big (" + inputFile.size + " > 48, OK to truncate and convert anyways)")) {return;}
		}
		let filename = stripExtension(inputFile.name);
		const reader = new FileReader();
		reader.onload = (e) => {
			// put the contents of the file in the inputData array buffer
			const buffer = new Uint8Array(e.target.result, 0, 48); // apparently you NEED two lines
			const inputArray = Uint8Array.from(buffer);
			// convert
			let outputArray = convertData(inputArray);
			// and then download as filename.gbl
			serialiseData(outputArray, filename + ".gbl");
		};
		reader.readAsArrayBuffer(inputFile);
	}
}

//    gbl   |  1bpp
//
//   halftile layout
// 01234567 | 02468ace
// 89abcdef | 13579bdf
//
//        halftile format
// where in the half-tile the nibble goes (X,Y)
// /------\        /------\
// 0,0; 0,1 : 04 | 0,0; 1,0 : 01
// 0,2; 0,3 : 15 | 0,1; 1,1 : 23
// 1,0; 1,1 : 26 | 0,2; 1,2 : 45
// 1,2; 1,3 : 37 | 0,3; 1,3 : 67
//            \/              \/
// which nibble each half-sliver shows
function convertData(inArray) {
	let outArray = new Uint8Array(48);
	let outOffs;
	let inOffs;
	// gbl is split into the top half and the bottom half
	for (let half = 0; half < 2; half++) {
		// which are further split into halftiles
		for (let tile = 0; tile < 6; tile++) {
			outOffs = half * 24 + tile * 4
			inOffs = half * 4 + tile * 8
			// process a half-tile
			outArray[outOffs + 0] = (inArray[inOffs + 0] & 0xf0) | ((inArray[inOffs + 1] >> 4) & 0x0f);
			outArray[outOffs + 1] = (inArray[inOffs + 2] & 0xf0) | ((inArray[inOffs + 3] >> 4) & 0x0f);
			outArray[outOffs + 2] = ((inArray[inOffs + 0] << 4) & 0xf0) | (inArray[inOffs + 1] & 0x0f);
			outArray[outOffs + 3] = ((inArray[inOffs + 2] << 4) & 0xf0) | (inArray[inOffs + 3] & 0x0f);
		}
	}
	return outArray;
}

function serialiseData(inArray, outfile) {
	// totally not stolen from stackoverflow
	let blob = new Blob([inArray]);
	let link = document.createElement("a");
	link.href = window.URL.createObjectURL(blob);
	link.download = outfile;
	link.click();
}

function stripExtension(inString) {
	let splitArray = inString.split(".");
	let outString = splitArray[0];
	for (let i = 1; i < splitArray.length - 1; i++) {
		outString += "." + splitArray[i];
	}
	return outString;
}
