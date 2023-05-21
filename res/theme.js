// set cookie and theme to query string, or load theme from cookie
// least invasive way to test cookies i could find
// having to push to test cookies, what a concept

// cookie functions
function setCookie(cname, cvalue, exdays) {
	const d = new Date();
	d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
	let expires = "expires="+d.toUTCString();
	document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
	let name = cname + "=";
	let ca = document.cookie.split(';');
	for(let i = 0; i < ca.length; i++) {
		let c = ca[i];
		while (c.charAt(0) == ' ') {
			c = c.substring(1);
		}
		if (c.indexOf(name) == 0) {
			return c.substring(name.length, c.length);
		}
	}
	return "";
}

// get theme query string
const params = new Proxy(new URLSearchParams(window.location.search), {
	get: (searchParams, prop) => searchParams.get(prop),
});

// check if a theme was passed in a query string
theme = params.theme
if (theme != null) { // create a cookie if so
	setCookie("theme", theme, 690)
} else { // (try to) load from cookie otherwise
	theme = getCookie("theme")
}
// set theme, if any
if (theme != null && theme != "") {
	// yes, this lets the user load invalid themes
	document.getElementById("theme").href = "/themes/" + theme + ".css";
}
