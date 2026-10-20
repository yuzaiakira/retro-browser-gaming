cmake_minimum_required(VERSION 3.21)

project(
	dot
	LANGUAGES C
	VERSION 1.0.0
	DESCRIPTION "Original MIT PS1 homebrew fixture (Dot)"
	HOMEPAGE_URL "https://github.com/"
)

file(GLOB _sources src/*.c)
psn00bsdk_add_executable(dot GPREL ${_sources})

psn00bsdk_add_cd_image(
	iso
	dot
	iso.xml
	DEPENDS dot system.cnf assets/tone.wav README.TXT
)

install(FILES ${PROJECT_BINARY_DIR}/dot.exe TYPE BIN)
