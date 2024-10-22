import Model from './model.js';

window.onload = function() {
  // fill me with relevant code
  
  
  window.M = new Model(); // CMK added this for testing, feel free to remove/replace
  //console.log(M); // CMK added this for testing, feel free to remove/replace
  let currentCommunityID = null; //this varibale is used to track which community page user is on
  
  //add event listener for 'Enter' key press in the search box
  document.getElementById('searchbox').addEventListener('keydown', function(event){
    if (event.key === 'Enter')
      searchPosts(event);
  });

  const homePage = document.getElementById('home-page');

  homePage.onclick = () => {
    currentCommunityID = null;
    toggleVisibility(['post-controls']);
    displayNewestPosts();
  };

  //recursive function calculate total count for comments (including nested replies)
function countTotalComments(commentIDs) {
  let totalComments = 0;

  commentIDs.forEach(commentID => {
    // Find the comment by its ID
    const comment = M.data.comments.find(c => c.commentID === commentID);
    
    if (comment) {
      // Count the comment itself
      totalComments += 1;
      
      // Recursively count its nested replies (if any)
      if (comment.commentIDs.length > 0) {
        totalComments += countTotalComments(comment.commentIDs);
      }
    }
  });

  return totalComments;
}  

 

  //Helper Function that create HTML structure for a post
  function formatPost(post)
  {
    const postElement = document.createElement('div'); //create new div element in the DOM, hold the information for the post
    postElement.classList.add('post-item'); //adds the class post-item to this div, for applying CSS style to it

    const flair = M.data.linkFlairs.find(f => f.linkFlairID === post.linkFlairID); // searches through the list of falirs in the Model to find the flair that matches the post.linkFlairID
    const flairContent = flair ? `(${flair.content})` : ''; // if the flair is found format it, else left the content empty

    /* create post elements:
        place post title in <h3>
        place link flair if the post have one in a paragraph
        place view and comments in a paragraph
        place a snipet of the post's content in a paragraph
    */

    postElement.innerHTML = `
        <p class="post-meta">${post.postedBy} | ${formatTimeStamp(new Date(post.postedDate))}</p> 
        <h3>${post.title}</h3>
        ${flairContent ? `<p class="flair">${flairContent}</p>` : ''}
        <p>${post.content.slice(0, 20)}...</p>
        <p class="post-details">Views: ${post.views} | Comments: ${countTotalComments(post.commentIDs)}</p>
      `;

    // when user click on a post, trigger an alert showing the post's title.
    //  implement post's full view later
    postElement.onclick = () => {
      //call the function to display the post page for this post
      displayPostPage(post.postID);
    } 

    return postElement;
  }

  // Helper function to display posts
  function displayPosts(posts, headerText = "All Posts")
  {
    const postList = document.getElementById('post-list'); //get post-list elements from HTML
    postList.innerHTML = ''; //clear any previously displayed posts

    posts.forEach(post => {
      const postElement = formatPost(post); //format post for each post
      postList.appendChild(postElement); // append each of the post to post list
    });

    // display post header, since other place may not display post header
    document.getElementById('post-header').style.display = 'block';
    
    // updates the text content in post-count
    document.getElementById('post-count').innerText = `${posts.length} posts`;
    document.getElementById('post-header').innerText = headerText;
  }
  //helper function for find the posts using post id, return an array of posts
  function getPostsByIDs(postIDs) {
    const posts = M.data.posts; // All available posts
    // Filter posts that have an ID matching one in the postIDs array
    const matchingPosts = posts.filter(post => postIDs.includes(post.postID));
    return matchingPosts; // Return the array of matching posts
  }
  //helper fucntion get comments array from a posts
  function getCommentsByIDs(commentIDs) {
    const comments = M.data.comments; // Assuming you have an array of all comments in your data model
    // Filter comments that have an ID matching one in the commentIDs array
    const matchingComments = comments.filter(comment => commentIDs.includes(comment.commentID));
    return matchingComments; // Return the array of matching comments
}

  // sorts posts by newest first (based on postedDate) and display them
  function displayNewestPosts()
  {
    // if the result comparison is (-) a is sorted before b, else b is sorted brfore a
    if(currentCommunityID === null){
      displayPosts(M.data.posts.sort((a,b) => b.postedDate - a.postedDate));
    }
    else{
      const com = M.data.communities.find(community => community.communityID === currentCommunityID);
      const communityPosts = getPostsByIDs(com.postIDs);
      displayPosts(communityPosts.sort((a, b) => b.postedDate - a.postedDate), "");
    }
  }
  function displayOldestPosts()
  {
    if(currentCommunityID === null){
      displayPosts(M.data.posts.sort((a,b)=> a.postedDate - b.postedDate));
    }
    else{
      const com = M.data.communities.find(community => community.communityID === currentCommunityID);
      const communityPosts = getPostsByIDs(com.postIDs);
      displayPosts(communityPosts.sort((a,b)=> a.postedDate - b.postedDate), "");
    }
  }
  // sort posts by the most recent comments from the 'most active' 
function displayActivePosts() {
    // Helper function to find the most recent comment date from a post's comments
    function getMostRecentCommentDate(post) {
        // Retrieve the comments using the comment IDs from the post
        const comments = getCommentsByIDs(post.commentIDs);

  //      if (!comments || comments.length === 0) return new Date(0); // Return earliest date if no comments
        
        // Find the most recent comment by date
        return comments.reduce((latest, comment) => {
            return comment.commentedDate > latest ? comment.commentedDate : latest;
        }, new Date(0)); // Default to earliest date
    }

    if (currentCommunityID === null) {
        // Get all posts and sort by the most recent comment date
        displayPosts(
            M.data.posts.sort((a, b) => getMostRecentCommentDate(b) - getMostRecentCommentDate(a))
        );
    } else {
        // Find the community by ID and get its posts
        const com = M.data.communities.find(community => community.communityID === currentCommunityID);
        const communityPosts = getPostsByIDs(com.postIDs);

        // Sort community posts by the most recent comment date
        displayPosts(
            communityPosts.sort((a, b) => getMostRecentCommentDate(b) - getMostRecentCommentDate(a)),
            ""
        );
    }
}


  //search functionality to handle multiple search terms
  function searchPosts(event) 
  {
    if (event.key === 'Enter')
    {
      const query = event.target.value.trim().toLowerCase();
      const searchTerms = query.split(/\s+/); // split the input by spaces in to seperate terms

      const filteredPosts = M.data.posts.filter(post=> {
        const postTitle = post.title.toLowerCase();
        const postContent = post.content.toLowerCase();

        const postMatches = searchTerms.some(term => postTitle.includes(term) || postContent.includes(term));
        
        const commentMatches = M.data.comments.some(comment => 
          post.commentIDs.includes(comment.commentID) && searchTerms.some(term => comment.content.toLowerCase().includes(term))
      );

        return postMatches || commentMatches;
      });

       // //Hide other elements
      // //show results
      toggleVisibility(['post-controls']);
      if (filteredPosts.length > 0)
      {
        displayPosts(filteredPosts, `Results for: "${query}"`);
      }
      else
      {
        document.getElementById('post-list').innerHTML = `<p>No results found for: "${query}"</p>`;
        document.getElementById('post-count').innerText = "0 posts";
        document.getElementById('post-header').innerText = `Results for: "${query}"`;
      }
    }
  }



  function communityPageView(communityID = null) {
    // Fetch the community links from the nav bar
    const communityLinks = document.querySelectorAll('.community-link');

    // If communityID is not provided, set it based on the clicked link
    if (!communityID) {
        communityLinks.forEach(link => {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                
                // Get the full href (URL) from the link
                const href = link.href;
                const url = new URLSearchParams(new URL(href).search);
                const clickedCommunityID = url.get('id');
                
                // Call communityPageView recursively with the clicked community ID
                communityPageView(clickedCommunityID);
            });
        });
    } else {
        // Use the provided communityID to update the community page
        currentCommunityID = communityID; // Track the community ID being displayed

        // Find the community object by ID in the model
        const community = M.data.communities.find(c => c.communityID === communityID);
        const compage = document.getElementById("community-page-view");

        if (community && compage !== null && compage !== undefined) {
            // Hide the general post section
            const postControls = document.getElementById('post-controls');
            const postHeader = document.getElementById('post-header');

            // Show community-page view and hide other elements
            toggleVisibility('community-page-view');

            // Clear the current main content area
            compage.innerHTML = '';

            // Create and populate the community-specific header
            const communityHeader = document.createElement('div');
            const startDate = community.startDate;
            communityHeader.innerHTML = `
                <h2>${community.name}</h2>
                <p>${community.description}</p>
                <p>Created ${formatTimeStamp(startDate)}</p>
                <p>Members: ${community.members.length}</p>
                <p>Post count: ${community.postIDs.length}</p>
            `;
            
            compage.appendChild(communityHeader);
            compage.style.display = 'block';

            // Show the post controls (sorting) and update it for the community posts
            postControls.style.display = 'block';
            postHeader.style.display = 'none';

            // Display the posts belonging to the community
            const posts = getPostsByIDs(community.postIDs);
            displayPosts(posts, "");
        }
    }
}

  function createNewCommunity()
  {
    // Get the UL element of community list from html
  const communityhtml = document.querySelector('.community-list');
  const createCommunityButton = document.getElementById('community-button');

  const confirm = document.getElementById('engender-community');
  

  //create new community 
  // Show new community form when "Create Community" button is clicked
  createCommunityButton.addEventListener('click', () => {
     // Hide the post section
    //  //Hide Other element
    //  // Show the new community form

    toggleVisibility(['new-community-form']);
    });
    
    confirm.addEventListener('click', ()=> {
    const communityName = document.getElementById('community-name').value.trim();
    const communityDescription = document.getElementById('community-description').value;
    const username = document.getElementById('username').value;

     // Validate inputs
     if (communityName === '' || communityDescription === '' || username === '') {
      alert('All fields are required');
      return;
  }

  if (communityName.length > 100 || communityDescription.length > 500) {
      alert('Community name or description exceeds the character limit');
      return;
  }
    // If all inputs are valid, create the community
      const newCommunity = {
        communityID: 'community' + (M.data.communities.length + 1), // Unique ID
        name: communityName,
        description: communityDescription,
        creator: username,
        postIDs:[],
        startDate: new Date(),
        members: [username] // First member is the creator
      };

      // Add new community to the model
      M.data.communities.push(newCommunity);

     // console.log('New Community Created:', newCommunity);
//helper function: Function to add a new community to the community list
function addCommunityToList(community) {
  const li = document.createElement('li'); // Create list item
  const link = document.createElement('a'); // Create link
  link.textContent = community.name; // Set link text
  link.href = `community.html?id=${community.communityID}`; // Set link
  link.className = 'community-link'; // Add CSS class
  li.appendChild(link); // Append link to list item
  communityhtml.appendChild(li); // Append list item to community list 
  }
      // Update the community list
      addCommunityToList(newCommunity);
      communityPageView(newCommunity.communityID);
      
      //clear the input in the new community form
      document.getElementById('community-name').value = '';
      document.getElementById('community-description').value = '';
      document.getElementById('username').value = '';

  });
  

 // Clear the current placeholder content
  communityhtml.innerHTML = '';
//update community list 
  // Loop through each community object in the model
  M.data.communities.forEach(community => {
      // a list item (li) element
      const li = document.createElement('li');
      
      // a link (a) element
      const link = document.createElement('a');
      link.textContent = community.name; // Set the text to the community name
      link.href = `community.html?id=${community.communityID}`; // Set the href to link of community
      
      // Add CSS class to the link
      link.className = 'community-link';
      
      // Append the link to the list item
      li.appendChild(link);
      
      // Append the list item to the community list
      communityhtml.appendChild(li);
      // Add the event listener to the new link
      communityhtml.addEventListener('click', (event) => {
        // Check if the clicked element is a link with the class 'community-link'
        if (event.target && event.target.classList.contains('community-link')) {
          event.preventDefault(); // Prevent the default link behavior
      
          // Get the full href (URL) from the link
       const href = link.href;

       // Extract the community ID from the query parameter (after '?id=')
         const url = new URLSearchParams(new URL(href).search);
        const communityID = url.get('id');

      
          // Find the community object by ID in the model
          const community = M.data.communities.find(c => c.communityID === communityID);
      
          if (community) {
            communityPageView()
          }
        }
      });
  });
  }




  // populate communities dropdown dynamiclly
  function populateCommunities()
  {
    const communitySelect = document.getElementById('community-selection');
    communitySelect.innerHTML = '<option value="">Select a community</option>';

    M.data.communities.forEach(community => {
      const option = document.createElement('option');
      option.value = community.communityID;
      option.textContent = community.name;
      communitySelect.appendChild(option);
    });

  }

  // populate link flairs dynamically
  function populateLinkFlair()
  {
    const flairSelect = document.getElementById('flair-selection');
    flairSelect.innerHTML = '<option value="">None</option>';

    M.data.linkFlairs.forEach(flair => {
      const option = document.createElement('option');
      option.value = flair.linkFlairID;
      option.textContent = flair.content;
      flairSelect.appendChild(option);
    });
  }

  // Implementing create new post
  function createNewPost()
  {
    const createPostButton = document.getElementById('create-post');
    const newPostForm =document.getElementById('new-post-form');
    const submitPostButton =document.getElementById('submit-post');

    newPostForm.style.display = 'none';

    //Show the new post form when "Create Post" button is clicked
    createPostButton.addEventListener('click', () => {
      // Hide the community form
      //Hide community Page view
      //show the new post form
      toggleVisibility('new-post-form');

      //populate dropdowns
      populateCommunities();
      populateLinkFlair();
    });

    // Handle post submission
    submitPostButton.addEventListener('click', () => {
      const postTitle = document.getElementById('post-title').value;
      const postContent = document.getElementById('new-post-content').value;
      const postUsername = document.getElementById('post-username').value;
      const selectedCommunityID = document.getElementById('community-selection').value; // Get the selected community
      const newFlair = document.getElementById('new-flair').value;

      //validate inputs that are required
      if (postTitle === '' || postContent === '' || postUsername === '' || selectedCommunityID === '')
      {
        alert('Please enter all required fields before you proceed.');
        return;
      }

      const selectedFlair = document.getElementById('flair-selection').value;
    
      if (selectedFlair && newFlair) 
      {
        alert('At more one link flair can be applied to a post');
        return;
      }
       
      if (newFlair) 
      {
        const newLinkFlair = 
        {
          linkFlairID: `lf${M.data.linkFlairs.length+1}`,
          content: `${newFlair}`
        };
        M.data.linkFlairs.push(newLinkFlair);
      }
      //Create a new post object
      const newPost = 
      {
        postID: `p${M.data.posts.length + 1}`,
        title: postTitle,
        content: postContent,
        linkFlairID: selectedFlair? selectedFlair : (newFlair? `lf${M.data.linkFlairs.length}` : null), 
        postedBy: postUsername,
        postedDate: Date.now(),
        commentIDs: [], 
        views: 0
      };
      //add the new post to the model datas
      M.data.posts.push(newPost);
      //add the new post to its belonging community
      const communityPost = M.data.communities.find(c => c.communityID === selectedCommunityID);
      communityPost.postIDs.push(newPost.postID);

      // //display post
      // displayPosts(M.data.posts, "All Posts");

      //Clear all form fields
      document.getElementById('community-selection').value = "";
      document.getElementById('post-title').value = "";
      document.getElementById('flair-selection').value = "";
      document.getElementById('new-flair').value = "";
      document.getElementById('new-post-content').value = "";
      document.getElementById('post-username').value = "";

      // //Hide the post form and show posts
      // newPostForm.style.display = 'none';
      // document.getElementById('post-controls').style.display = 'block';

      displayNewestPosts();
      const homeButton = document.getElementById('home-page');
      if (homeButton) {
        homeButton.click(); // Simulate the click event
     }
      
      
    });
  }

    // Format Time Stamp same as requirements
  function formatTimeStamp(timestamp)
  {
    const date = new Date(timestamp);
    const now = Date.now();
    const difference = now - date.getTime();

    //convert milliseconds to seconds
    const seconds = Math.floor(difference/1000);
    if (seconds < 60) return `${seconds} seconds ago`;

    const minutes = Math.floor(seconds/60);
    if (minutes < 60) return `${minutes} minutes ago`;

    const hours = Math.floor(minutes/60);
    if (hours < 24) return `${hours} hours ago`;

    const days = Math.floor(hours/24);
    if (days < 30) return `${days} days ago`;

    const months = Math.floor(days/30);
    if (months < 12) return `${months} months ago`;

    const years = Math.floor(months/12);
    return `${years} years ago`;
  }

    //Implementation of Post Page View
  function displayPostPage(postID)
  {
    //Get the selected post by its ID
    const post = M.data.posts.find(p => p.postID === postID);
    post.views += 1;
    // if (!post) {
    //   console.error("Post not found");
    //   return; // Safely exit if post is invalid
    // }// debugginh

    //display the current page view and hide other elements
    toggleVisibility('post-page');

    // Set post Title
    const postTitle = document.getElementById('post-page-title');
    // console.log(`post title: ${post.title}: , postID: ${postID}, post: ${post}`);
    // console.log(post); //debugging
    postTitle.textContent = post.title;

    //Set Community name and timestamp
    const communityName = document.getElementById('post-community-name');
    const postCommunity = M.data.communities.find(c => c.postIDs.includes(postID));
    communityName.textContent = `${postCommunity.name} | ${formatTimeStamp(new Date(post.postedDate))}`;

    //Set post details (author and flair)
    const postDetails = document.getElementById('post-details');
    const flair = M.data.linkFlairs.find(flr => flr.linkFlairID === post.linkFlairID);
    const flairContent = flair ? ` | ${flair.content}` : ''; // check if flair exist
    postDetails.textContent = `Posted by ${post.postedBy}${flairContent}`;

    //Set the post page content
    const postContent = document.getElementById('post-content');
    postContent.textContent = post.content;

    //Set the post meta (views and comments count)
    const postMeta = document.getElementById('post-meta');
    postMeta.innerHTML = `Views: <span id="view-count">${post.views}</span> | Comments: <span id="comment-count">${countTotalComments(post.commentIDs)}</span>`;

    //add comment button
    const addCommentButton = document.getElementById('add-comment');
    addCommentButton.addEventListener('click', () => {
      displayNewCommentPage(postID); // Navigate to the new comment page view
    });

    //display the comments
    const commentsList = document.getElementById('comments-list');
    displayComments(post.commentIDs, commentsList, postID);
  }



  //a helper function that take a comment id and reply which level it should go to
  function findCommentLevel(targetCommentID, comments, depth = 0) {
    // Iterate over each comment in the comments array
    for (const comment of comments) {
      // If the target comment ID is directly in the current comment's replies, return depth + 1
      if (comment.commentIDs.includes(targetCommentID)) {
        return depth + 1;
      }
  
      // If the current comment has replies, recursively check the replies
      if (comment.commentIDs.length > 0) {
        let nestedLevel = findCommentLevel(targetCommentID, comments.filter(c => comment.commentIDs.includes(c.commentID)), depth + 1);
        if (nestedLevel !== 0) {
          return nestedLevel;
        }
      }
    }
  
    // Return -1 if the comment is not found at any depth
    return 0;
  }
  function displayNewCommentPage(postID, parentCommentID = null)
  {
    const mainContent = document.getElementById('main');
    // const previousMainContent = mainContent.innerHTML;
    // mainContent.innerHTML = ''; //Clear the current main content

    toggleVisibility('new-comment-page');

    // Create the new comment page structure
    const commentPage = document.getElementById('new-comment-page');
    commentPage.innerHTML = `
      <h2>Add a Comment</h2>
      <form id="comment-form">
        <label for="comment-content">Your Comment (max 500 characters):</label>
        <textarea id="comment-content" maxlength="500" required></textarea>
        <div id="comment-error" class="error-message class="hidden">Comment is required and should not exceed 500 characters.</div>

        <label for="comment-username">Username: </label>
        <input type="text" id="comment-username" required>
        <div id="username-error" class="error-message class="hidden">Username is required.</div>

        <button type="button" id="submit-comment">Submit Comment</button>
      </form>
      <button id="cancel-comment">Cancel</button> <!-- Button to cancel and go back to post view page -->
    `;

    //Append the new comment page to main content
    mainContent.appendChild(commentPage);

    //Handle comment submission
    document.getElementById('submit-comment').addEventListener('click', () => {
      const commentContent = document.getElementById('comment-content').value.trim();
      const commentUsername = document.getElementById('comment-username').value.trim();

      //Validate input
      let isValid = true;
      if (commentContent === '' || commentContent.length > 500)
      {
        document.getElementById('comment-error').classList.remove('hidden');
        isValid = false;
      }
      
      if (commentUsername === '')
      {
        document.getElementById('username-error').classList.remove('hidden');
        isValid = false;
      }

      if (!isValid) return;

      //Create new comment object
      const newComment = 
      {
        commentID: `comment${M.data.comments.length + 1}`,
        content: commentContent,
        commentIDs: [], //Empty array for nested replies for now
        commentedBy: commentUsername,
        commentedDate: Date.now()
      }

      //Add the comment to the model
      M.data.comments.push(newComment);

      // If it's a reply to another comment, add it to that comment's commentIDs array
      if (parentCommentID)
      {
        const parentComment = M.data.comments.find(comment => comment.commentID === parentCommentID);
        parentComment.commentIDs.push(newComment.commentID);
      }
      else
      {
        // If it's a comment directly on the post, add it to the post's commentIDs array
        const post = M.data.posts.find(p => p.postID === postID);
        post.commentIDs.push(newComment.commentID);
      }

      // mainContent.innerHTML = previousMainContent;
      commentPage.innerHTML = '';
      //Redirect back to the Post Page view and refresh comments
      displayPostPage(postID);
    });

    //Handle cancel comment ( go back to the Post Page)
    document.getElementById('cancel-comment').addEventListener('click', () => {
      // mainContent.innerHTML = previousMainContent;
      commentPage.innerHTML = '';
      displayPostPage(postID);
    });
  }

  function displayComments(commentIDs, parentElement, postID)
  {
    parentElement.innerHTML = ''; //clear existing comments

    //Get all commentsby their IDs
    const comments = commentIDs.map(id => M.data.comments.find(comment => comment.commentID === id));
    // Sort by Newest first
    comments.sort((a,b) => b.commentedDate - a.commentedDate);

    comments.forEach(comment => {
      const commentElement = document.createElement('div');
      commentElement.classList.add('comment');

      // Determine the level of indentation based on nesting
      const level = findCommentLevel(comment.commentID, M.data.comments);
      const indent = level * 20;

      //Create comment structure
      commentElement.innerHTML = `
    <div class="comment-content" style="margin-left: ${indent}px">
      <p class="comment-meta">
        - <strong>${comment.commentedBy}</strong> | ${formatTimeStamp(comment.commentedDate)}
      </p>
      <p class="comment-text">${comment.content}</p>
      <button class="reply-button" data-id="${comment.commentID}" data-post-id="${postID}">Reply</button>
    </div>
  `;

      //Append the comment element to the parent
      parentElement.appendChild(commentElement);

      //Handle reply button
      const replyButton = commentElement.querySelector('.reply-button');
      replyButton.addEventListener('click', () => {
        //Get Comment ID
        const parentCommentID = comment.commentID;
        // console.log(`commentID: ${comment.commentID}, children commentIDs: ${comment.commentIDs}`);
        //Open the new comment page view as a reply to the current comment
        displayNewCommentPage(postID, parentCommentID);
      });

      //Check for replies to this comment
      if (comment.commentIDs.length > 0)
      {
        const repliesContainer = document.createElement('div');
        repliesContainer.classList.add('replies');
        commentElement.appendChild(repliesContainer);
        // Display relies in the nested structure
        displayComments(comment.commentIDs, repliesContainer, postID); 
      }
    });
  }
  
  //
  function toggleVisibility(visibleElementsIds)
  {
    const allViews = [
      'post-page', 
      'post-controls', 
      'new-community-form', 
      'community-page-view', 
      'new-post-form',
      'new-comment-page',
    ];

    allViews.forEach(view => {
      const element = document.getElementById(view);
      if (element) //if the element exist
      {
        if (visibleElementsIds.includes(view)){
          element.style.display = 'block'; //show the element if it's in the postViews list
          element.style.zIndex = 10; // ensure the element is on top
          element.style.position = 'relative'; //ensure it's relative to other elements
        }
        else
          element.style.display = 'none'; //hide the element
      }
    })
  }

  displayNewestPosts();

  //pass in function reference 'functioname' instead of 'functionname()' calling the function directly
  // because we only want it to execute when the newest is onclick
  document.getElementById('sort-newest').onclick = displayNewestPosts; 
  document.getElementById('sort-oldest').onclick = displayOldestPosts;
  document.getElementById('sort-active').onclick = displayActivePosts;

  
  createNewCommunity();

  createNewPost();

  communityPageView();

};

