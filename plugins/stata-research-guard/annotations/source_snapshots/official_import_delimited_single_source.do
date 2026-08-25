* Mechanics-only snapshot derived from StataCorp's import delimited manual.
* The target file path is the only required binding; comma and tab detection
* remain Stata defaults unless the source contract requires an explicit option.
import delimited using "$raw/source_file.csv", clear
