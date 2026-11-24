project(TestNative)
cmake_minimum_required(VERSION 3.9.0)

set (CMAKE_CXX_STANDARD 20)

add_library(TestNative SHARED src/main/cpp/cpp-adapter.cpp)

include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/TestNative+autolinking.cmake)

find_library(LOG_LIB log)
target_link_libraries(TestNative ${LOG_LIB} android)
