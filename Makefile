jsDir=examples/js
srcDir=src

all:

clean:

	rm -rf $(jsDir)

js:

#	--compilation_level ADVANCED_OPTIMIZATIONS \#
	[ -d js ] || mkdir -p $(jsDir)
	java -jar tools/compiler.jar \
	--js $(srcDir)/other/windowStack.js \
	--js $(srcDir)/other/terminal.js  \
	--js $(srcDir)/other/base64.js \
	--js $(srcDir)/other/swfobject.js \
	--js $(srcDir)/other/resampler.js \
	--js $(srcDir)/other/XAudioServer.js \
	--js $(srcDir)/other/resize.js \
	--js $(srcDir)/GameBoyCore.js \
	--js $(srcDir)/GameBoyIO.js \
	--js_output_file $(jsDir)/gameboy.js



