# Raspberry pi GPIO helpers made for Deno
An interface for interacting and reading from the raspberry pi GPIO pins using *sysfs*

## Why?
> Just for shits and giggles.
> Also why not? LOL!

# Examples
### Turning on an LED:
```TypeScript
/*
- set pin direction to out. will auto-export the pin
- also sets the pin value. RPs do not have analogue: 1 for HIGH 0 for LOW
*/
const pin23 = new Pin(23, PinDirection.OUT, 1); 

setTimeout(async ()=>{
    await pin23.setPin(0); // Sets pin back to 0
    await pin23.unexport(); // unexport the pin after usage. can be done automatically
}, 3000)
```
As denoted in the code above, it is not mandatory to unexport the pins as the library will attempt to do that at program exit but it is **highly recommended** you do so manually for in the case that the library fails to unexport.
> async awaits can be removed if pin ordering does not matter to you.

### Listening for button press
```TypeScript
const button = new Pin(24, PinDirection.IN);

while(true){
    if(await button.readPin() == 1){
        console.log("button pressed");
        await button.unexport();
        break;
    }
}
```

# Methods
TODO

# Limitations
1. JavaScript it not very 'precise'. i.e. no microsecond delay support for interacting with hardware that requires this (e.g. DHT11)

# Deno on the pi?
> YES!!!!
[This will explain it all](https://github.com/LukeChannings/deno-arm64)