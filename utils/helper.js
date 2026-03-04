

exports.isEmpty = (value) => {
    return (
        // null or undefined
        (value == null) ||

        // has length and it's zero
        (value.hasOwnProperty('length') && value.length === 0) ||

        // is an Object and has no keys
        (value.constructor === Object && Object.keys(value).length === 0)
    )
}

exports.parseName = (input) => {
    var fullName = input || "";
    var result = {};

    if (fullName.length > 0) {
        var nameTokens = fullName.match(/(?:(?:[A-ZÁ-ÚÑÜ][a-zá-úñü]+){1,2}\s)|(?:(?:[aeodlsz]{1,3}[ ]){0,2}[A-ZÁ-ÚÑÜ][a-zá-úñü]+)/gms) || [];

        if (nameTokens.length > 3) {
            result.name = nameTokens.slice(0, 2).join(' ');
        } else {
            result.name = nameTokens.slice(0, 1).join(' ');
        }

        if (nameTokens.length > 2) {
            result.lastName = nameTokens.slice(-2, -1).join(' ');
            result.secondLastName = nameTokens.slice(-1).join(' ');
        } else {
            result.lastName = nameTokens.slice(-1).join(' ');
            result.secondLastName = "";
        }
    }

    return result;
}

exports.hasSubscriptionEnded = (subscriptionEndDate) => {
    const currentDate = new Date();
    const endDate = new Date(subscriptionEndDate);

    // Check if the subscription end date is before the current date
    return endDate < currentDate;
}

exports.escapeString = (str) => {
    if (str === null || str === undefined) {
        return str;
    }
    return str
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
        .replace(/"/g, '\\"')
        .replace(/'/g, "\\'");
}

exports.getNameParts = (name, email) => {
    if (!name || name.trim() === "") {
        // If name is empty, extract name parts from the email
        if (email && email.includes("@")) {
            const emailPrefix = email.split("@")[0]; // Extract the part before '@'
            const nameParts = emailPrefix.split(".");
            const firstName = nameParts[0] || ""; // First part of the email prefix
            const lastName = nameParts[1] || "";  // Second part of the email prefix (if available)
            return { firstName: capitalize(firstName), lastName: capitalize(lastName) };
        }
        // If email is also invalid, return empty strings
        return { firstName: "", lastName: "" };
    }

    // If name is provided, split it into first and last name
    const [firstName = "", lastName = ""] = name.split(" ");
    return { firstName, lastName };
};

// Helper function to capitalize the first letter of a string
const capitalize = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
};
