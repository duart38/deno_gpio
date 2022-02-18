# Raspberry pi GPIO helpers made for Deno
An interface for interacting and reading from the raspberry pi GPIO pins using *sysfs*


# Examples
### Turning on an LED:
```TypeScript
const pin21 = new Pin(23, PinDirection.OUT); // set pin direction to out. will auto-export the pin
await pin21.setPin(1); // sets the pin value. RPs do not have analogue: 1 for HIGH 0 for LOW

setTimeout(async ()=>{
    console.log(await pin21.setPin(0)); // Sets pin back to 0
    console.log(await pin21.unexport()); // unexport the pin after usage. can be done automatically
}, 3000)
```
As denoted in the code above, it is not mandatory to unexport the pins as the library will attempt to do that at program exit but it is **highly recommended** you do so manually for in the case that the library fails to unexport.

# Deno on the pi?? huh??
[This will explain it all](https://github.com/LukeChannings/deno-arm64)