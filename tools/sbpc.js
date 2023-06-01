'use strict';

const fileInput = document.getElementById("fileinput");

dropbox.addEventListener("dragenter", drag, false);
dropbox.addEventListener("dragover", drag, false);
dropbox.addEventListener("drop", dropProcess, false);
fileInput.addEventListener("input", fileProcess, false);

function drag(e) {
	e.stopPropagation();
	e.preventDefault();
}

/*
0x42, 0x4d, // "BM"
0x6e, 0x00, 0x00, 0x00, // filesize
0x00, 0x00, 0x00, 0x00, // ignore
0x3e, 0x00, 0x00, 0x00, // pixel data offset
0x28, 0x00, 0x00, 0x00, // DIB header size
0x30, 0x00, 0x00, 0x00, // width
0x08, 0x00, 0x00, 0x00, // height
0x01, 0x00, // color planes, always 1
0x01, 0x00, // bit depth
0x00, 0x00, 0x00, 0x00, // compression method
0x30, 0x00, 0x00, 0x00, // image size, can be 0 for BI_RGB
0x13, 0x0b, 0x00, 0x00, // width (pix/m)
0x13, 0x0b, 0x00, 0x00, // height (pix/m)
0x02, 0x00, 0x00, 0x00, // number of colors (or 0 for max)
0x00, 0x00, 0x00, 0x00, // ignore
// color palette, B,G,R,a
// pixel data, bottom-to-top scanlines, left-to-right pixels
*/

/*     palette------------------------->o.palette->OUT.PAL
      /                                /         \
IN.BMP->pixels->tiles->b.tiles->u.tiles---------->o.p.tiles->b.p.tiles->4bpp->OUT.4BPP
      \                       \                            \  ^^^^^^^
       header                  tilemap--------------------->b.p.tilemap->OUT.PCT
*/

function dropProcess(e) {
	drag(e);
	new DataTransfer();
	const dt = e.dataTransfer;
	const files = dt.files;
	for (let i = 0; i < 1 /* files.length */; i++) {
		deserialiseData(files[i]);
	}
}

function fileProcess(e) {
	for (let i = 0; i < 1 /* this.files.length */; i++) {
	deserialiseData(this.files[i]);
	}
}

const reader = new FileReader();
let filename

function deserialiseData(inputFile) {
	filename = stripExtension(inputFile.name);
	reader.readAsArrayBuffer(inputFile);
}


reader.onload = (e) => {
	// read header and verify it
	let buffer = new Uint8Array(e.target.result);
	const headerArray = Uint8Array.from(buffer.slice(0, 54));
	let startOfPalette = findPaletteStart(headerArray)
	if (startOfPalette == undefined) {return;}
	// read palette
	const paletteArray = Uint8Array.from(buffer.slice(startOfPalette, startOfPalette + 1024));
	let startOfPixelArray = 0;
	// read pixel array
	for (let i = 0; i < 4; i++) {
		startOfPixelArray += headerArray[10 + i] << (i * 8)
	}
	const pixelArray = Uint8Array.from(buffer.slice(startOfPixelArray, startOfPixelArray + (256 * 224)));
	// convert pixel array to tiles
	const tileArray = pixelToTile(pixelArray);
	const borderTileArray = new Uint8Array(removeScreenTiles(tileArray));
	// deduplicate tiles
	const tilemapArray = new Uint16Array(borderTileArray.length / 64);
	const uniqueTileArray = new Uint8Array(deduplicateTiles(borderTileArray, tilemapArray));
	// tally colors
	const colorsArray = tallyColors(uniqueTileArray);
	// convert that data to a more useful format
	const colorLookupArray = sortColors(colorsArray);
	if (colorLookupArray == undefined) {alert("too many colors!"); return;}
	const palOutArray = convertColors(paletteArray, colorLookupArray);
	// reorder tile colors
	const colorTileArray = reorderTileColors(uniqueTileArray, colorLookupArray);
	// tally per-tile colors // the names keep getting worse
	const tileColorsArray = tallyTileColors(colorTileArray);
	// bitpack tiles

	// convert to 4bpp
	const tile4bppArray = convert4bpp(colorTileArray);
	//
	const tilemapOutArray = aaaaaaaa(tilemapArray);
	// download
	serialiseData(tile4bppArray, "out.4bpp");
	serialiseData(palOutArray, "out.pal");
	//serialiseData(tilemapOutArray, "out.pct");
	// lets just say it was fun to debug
	console.log(tileArray.length / 64 + " input tiles");
	console.log(borderTileArray.length / 64 + " border tiles");
	console.log(uniqueTileArray.length / 64 + " unique tiles");
	console.log("done");
};

function aaaaaaaa/* perfect name */(inArray) {
	let outArray = new Uint8Array(inArray.length * 2);
	for (const i in inArray) {
		outArray[i * 2] = inArray[i];
		outArray[i * 2 + 1] = 0x10;
	}
	return outArray;
}

// find start of palette and validate the header
function findPaletteStart(header) {
	// check magic values ("BM")
	if (header[0] != 0x42 || header[1] != 0x4d) {
		alert("not a bitmap"); return;
	}
	// check if this is BITMAPCOREHEADER or BITMAPINFOHEADER
	const headerSize = 14;
	let headerWidth;
	let headerHeight;
	let headerColorPlanes;
	let headerBitDepth;
	if (header[headerSize] == 12) {
		// BITMAPCOREHEADER
		headerWidth = 18;
		headerHeight = 20;
		headerColorPlanes = 22;
		headerBitDepth = 24;
	} else if (header[headerSize] == 40) {
		// BITMAPINFOHEADER
		headerWidth = 18;
		headerHeight = 22;
		headerColorPlanes = 26;
		headerBitDepth = 28;
	} else {
		alert("unrecognised header"); return;
	}
	// verify correct width and height
	let width = header[headerWidth] + (header[headerWidth + 1] << 8);
	if (width != 256) {
		alert("incorrect width (" + width + " != 256)"); return;
	}
	let height = header[headerHeight] + (header[headerHeight + 1] << 8);
	if (height != 224) {
		alert("incorrect height (" + height + " != 224)"); return;
	}
	// verify bit depth and planes
	let colorPlanes = header[headerColorPlanes] + (header[headerColorPlanes + 1] << 8);
	if (colorPlanes != 1) {
		alert("incorrect color planes, probably not a valid bitmap"); return;
	}
	let bitDepth = header[headerBitDepth] + (header[headerBitDepth + 1] << 8);
	if (bitDepth != 8) {
		alert("incorrect bit depth (" + bitDepth + " != 8)"); return;
	}
	// if all that passes, then this is probably a valid file
	return headerSize + header[headerSize];
}

function pixelToTile(inArray) {
	let outArray = new Uint8Array(inArray.length);
	let inOffs;
	let outOffs;
	// tile
	for (let tv = 0; tv < 224 / 8; tv++) {
		for (let th = 0; th < 256 / 8; th++) {
			// pixel
			for (let pv = 0, rv = 7; pv < 8; pv++, rv--) {
				for (let ph = 0, rh = 7; ph < 8; ph++, rh--) {
					inOffs = ((tv * 8) + rv) * 256 + ((th * 8) + rh); // dumb hack for tile orientation
					outOffs = ((((27 - tv /* dumb hack for tilemap ordering */) * 32) + th) * 8 + pv) * 8 + ph;
					outArray[outOffs] = inArray[inOffs];
				}
			}
		}
	}
	return outArray;
}

function removeScreenTiles(inArray) {
	const tile = 64;
	const line = 32;
	const gap = 20;
	const horizontal = line - gap;
	const vertical = (5 * line) + (horizontal / 2);
	let outArray = new Array;
	// copy first chunk
	let i;
	for (i = 0; i < vertical * tile; i++) {
		outArray.push(inArray[i]);
	}
	// copy just the right lines
	let inOffs = (gap + vertical) * tile;
	let outOffs = vertical * tile;
	for (let row = 0; row < 17 /* stupid off-by-one */; row++) {
		for (i = 0; i < tile * horizontal; i++) {
			outArray.push(inArray[inOffs + i]);
		}
		inOffs += line * tile;
		outOffs += horizontal * tile;
	}
	// copy last chunk
	for (i = 0; i < vertical * tile; i++) {
		outArray.push(inArray[inOffs + i]);
	}
	return outArray;
}

function deduplicateTiles(inArray, tileArray) {
	let outArray = new Array();
	// process each input tile
	for (let inTile = 0; inTile < inArray.length / 64; inTile++) {
		// check if it appears in output
		tileArray[inTile] = findDuplicates(inArray.slice(inTile * 64, (inTile + 1) * 64), outArray);
	}
	return outArray;
}

function findDuplicates(inArray, outArray) {
	// for each tile
	for (let outTile = 0; outTile < outArray.length / 64; outTile++) {
		let i
		for (i = 0; i < 64; i++) {
			if (inArray[i] != outArray[outTile * 64 + i]) {break;}
		}
		if (i == 64) {return outTile;}
	}
	// if no matching tile found, push tile
	return (outArray.push(...inArray) / 64) - 1;
}

function tallyColors(inArray) {
	let colorsArray = new Array(256).fill(0);
	for (let tile = 0; tile < inArray.length / 64; tile++) {
		let tileColorsArray = new Array(256).fill(0);
		// set flag for each appearing color in the tile
		for (let i = 0; i < 64; i++) {
			tileColorsArray[inArray[tile * 64 + i]] = 1;
		}
		// sum??
		for (const i in colorsArray) {
			colorsArray[i] += tileColorsArray[i];
		}
	}
	return colorsArray;
}

function sortColors(inArray) {
	let unsortedArray = Array.from(inArray);
	let outArray = new Array(256).fill(0);
	for (let i = 1; i < 16; i++) {
		let sortedArray = Array.from(unsortedArray);
		sortedArray.sort();
		let ele2 = sortedArray[sortedArray.length - 1];
		let y = unsortedArray.findIndex((ele) => {return ele == ele2;});
		outArray[y] = i;
		unsortedArray[y] = -1;
	}
	// check if more than 15 colors
	unsortedArray.sort();
	if (unsortedArray[unsortedArray.length - 1] > 0) {return;}
	//
	return outArray;
}

function convertColors(inArray, refArray) {
	let outArray = new Uint8Array(16 * 3 * 2).fill(0);
	// 15 col x 1
	for (let i = 1; i < 16; i++) {
		let pos = refArray.findIndex((ele) => {return ele == i;});
		if (pos == -1) {break;}
		let color = 0;
		for (let c = 0; c <= 2; c++) {
			color |= ((inArray[pos * 4 + c] >> 3) & 0x1f) << ((2 - c) * 5);
		}
		outArray[i * 2 + 0] = color >> 0;
		outArray[i * 2 + 1] = color >> 8;
	}
	// 5 col x 3
	for (let i = 0; i < 3; i++) {
		for (let c = 0; c < 10; c++) {
			outArray[34 + i * 10 + c] = outArray[2 + c];
		}
	}
	// 3 col x 5
	for (let i = 0; i < 5; i++) {
		for (let c = 0; c < 6; c++) {
			outArray[66 + i * 6 + c] = outArray[2 + c];
		}
	}
	return outArray;
}

function reorderTileColors(inArray, lookupArray) {
	let outArray = new Uint8Array(inArray);
	for (const i in outArray) {
		outArray[i] = lookupArray[inArray[i]];
	}
	return outArray;
}

function tallyTileColors(inArray) {
	let outArray = new Uint8Array(inArray.length / 64);
	for (const i in outArray) {
		outArray[i] = Math.max(...inArray.slice(i * 64, (i + 1) * 64));
	}
	return outArray;
}

function convert4bpp(inArray) {
	let outArray = new Uint8Array(inArray.length / 2)
	for (let tile = 0; tile < inArray.length / 8; tile++) {
		for (let sliver = 0; sliver < 8; sliver++) {
			let bitplanes = new Array(4).fill(0)
			for (const plane in bitplanes) {
				for (let bit = 0; bit < 8; bit++) {
				bitplanes[plane] |= ((inArray[tile * 64 + sliver * 8 + bit] >> plane) & 0b1) << bit;
				}
			}
			outArray[tile * 32 + sliver * 2 +  0 + 0] = bitplanes[0];
			outArray[tile * 32 + sliver * 2 +  0 + 1] = bitplanes[1];
			outArray[tile * 32 + sliver * 2 + 16 + 0] = bitplanes[2];
			outArray[tile * 32 + sliver * 2 + 16 + 1] = bitplanes[3];
			// this has no right to work, but it seems to work
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
