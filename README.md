#jquery.readonly

jquery.readonly is a plugin which set an element and all its child elements in readonly mode.  

Elements and (asp.net) validators get disabled and events get blocked automaticaly.

There is also a grayscale option for a more visual effect when setting readonly.

This is convenient for setting input forms or certain parts of the inputform in 'readonly' mode.

##usage:

$(selector).readonly();  //set readonly
$(selector).readonly('reset'); //set normal, undo readonly