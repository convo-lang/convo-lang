# Convo Make
This is a concept of what a generative version of the `make` build system might look like.

The idea is similar to the make build system. `.convo` files and Markdown files will be used to generate outputs that could be anything from React components to images or videos.

It should provide for a way to define generated applications and content in a very declarative way that is repeatable and easy to modify. It should also minimize the number of token and time required to generate large applications since outputs can be cached and generated in parallel.

You can basically think of it as each target output file will have it's own Claude sub agent.

![convo](https://raw.githubusercontent.com/convo-lang/convo-lang/refs/heads/main/assets/convo-make.png)
