# simple_comunica_runner

A Comunica runner for benchmarking purposes

## Installation
**Important Make sure to have install the submodules**

```sh
./install.sh
```
The script will install the submodule and the dependencies of the repository

## Usage

```
Usage: evaluation [options]

CLI program to run a SPARQL query using Comunica for the context of benchmarking

Options:
  -V, --version                       output the version number
  -q, --query <string>                query to execute
  -c, --config <string>               File path of the config
  -t, --timeout <number>              Timeout of the query in second (default: 120000)
  -hdt, --pathFragmentation <string>  The file path of the dataset for querying over HDT. When not specified, it will execute an LTQP query.
  -h, --help                          display help for command
```
