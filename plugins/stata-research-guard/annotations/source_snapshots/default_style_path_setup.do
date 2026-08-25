* Default path roles for an approved new project.
* Replace only the approved project root. Existing projects keep their own layout.
global project "C:/path/to/project"
global data    "$project/data"
global dofiles "$project/do"
global log     "$dofiles"
global ster    "$project/ster"
global table   "$project/table"
global figures "$project/figures"

capture mkdir "$dofiles"
capture mkdir "$ster"
capture mkdir "$table"
capture mkdir "$figures"
