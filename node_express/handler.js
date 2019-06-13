"use strict"

module.exports = (event, context) => {
    var i;
    var sum = 0;
    for (i = 0; i < 150000000; i++) {
        sum = sum+Math.sqrt(i);
    }
    let err;
    const result =             {
        status: "You said: " + JSON.stringify(event.body)
    };

    context
        .status(200)
        .succeed(result);
}
