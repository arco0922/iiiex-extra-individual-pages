const backend_path = 'https://seisaku10ux.herokuapp.com'; //サーバーのurl
const lobby_path = 'https://yahoopuyo.github.io/iiie2021_UX/';
const roomId = '1'; //ここに作品IDを入れて下さい

const header = document.getElementById('header');
const contents_middle = document.getElementById('contents_middle');
const react_window = document.getElementById('react_window');
const react_window_container = document.getElementById(
    'react_window_container'
);
const toggle = document.getElementById('react_toggle');

const calc_margintop = () => {
    if (
        contents_middle.offsetHeight <
        window.innerHeight - header.offsetHeight
    ) {
        contents_middle.style.marginTop = `${Math.max(
            (window.innerHeight - contents_middle.offsetHeight) / 3,
            50
        )}px`;
    } else {
        contents_middle.style.marginTop = '50px';
    }
};

calc_margintop();
toggle.checked = true;

const enableReaction = () => {
    react_window.classList.add('active');
    react_window_container.classList.add('active');
};

const disableReaction = () => {
    react_window.classList.remove('active');
    react_window_container.classList.remove('active');
};

toggle.addEventListener('change', (event) => {
    if (event.target.checked) {
        enableReaction();
    } else {
        disableReaction();
    }
});

window.addEventListener('resize', () => {
    calc_margintop();
});

//サーバーとWebSocket通信を確立
//queryでroomIdを送ることで、サーバー側でsocket.ioにおける該当のRoomにjoinする処理が行われる
const socket = io(`${backend_path}/individual`, {
    query: {
        roomId: roomId,
    },
});

var members = []; //この部屋に参加している全員のsocketIdの配列

const createMember = (n_memberId) => {
    if (n_memberId !== socket.id) {
        const people = document.createElement('div');
        const peopleImg = document.createElement('img');
        const peopletype = Math.floor(Math.random() * 8) + 1;
        const gray = Math.random() * 3 + 1;
        peopleImg.setAttribute('src', `./assets/people/${peopletype}.png`);
        people.setAttribute('id', n_memberId);
        people.classList.add('member');
        people.style.position = 'absolute';
        people.style.bottom = '0px';
        peopleImg.style.height = '70px';
        const w = peopleImg.offsetWidth;
        peopleImg.style.filter = `grayScale(1) brightness(${gray})`;
        people.appendChild(peopleImg);
        react_window.appendChild(people);
        setTimeout(() => {
            people.classList.add('exist');
        }, 10);
    }
};
const deleteMember = (n_memberId) => {
    const people = document.getElementById(n_memberId);
    people.classList.add('gone');
    setTimeout(() => {
        react_window.removeChild(people);
    }, 1000);
};

const updateMemberPos = (members) => {
    const all = members.length;
    var idx = 1;
    members.map((member) => {
        if (member !== socket.id) {
            const membersElement = document.getElementById(member);
            const offset = (idx / all) * 100;
            const w = membersElement.offsetWidth;
            membersElement.style.left = `calc(${offset}% - 25px)`;
            idx += 1;
        }
    });
};

const updateMembers = (n_members) => {
    n_members.map((member) => {
        if (!members.includes(member)) createMember(member);
    });
    members.map((member) => {
        if (!n_members.includes(member)) deleteMember(member);
    });
    updateMemberPos(n_members);
    members = n_members;
};

const createMyReaction = (reactionId) => {
    const reactionButtonElement = document.getElementById(
        `ReactButton_${reactionId}`
    );
    const w = reactionButtonElement.offsetWidth;

    const reaction = document.createElement('img');
    reaction.setAttribute('src', `./assets/buttons/Emoji_${reactionId}.png`);
    reaction.classList.add('myReaction');
    reaction.style.display = 'block';
    reaction.style.position = 'absolute';
    reaction.style.top = '0px';
    reaction.style.left = `${w * 0.15}px`;
    reaction.style.width = `${w * 0.7}px`;
    reaction.style.zIndex = '10';
    reactionButtonElement.appendChild(reaction);
    setTimeout(() => reaction.classList.add('disappeared'), 10);
    setTimeout(() => reactionButtonElement.removeChild(reaction), 1500);
};

const createOthersReaction = (senderId, reactionId) => {
    const senderElement = document.getElementById(senderId);
    const reaction = document.createElement('img');
    reaction.setAttribute('src', `./assets/buttons/Emoji_${reactionId}.png`);
    reaction.classList.add('othersReaction');
    reaction.style.display = 'block';
    reaction.style.position = 'absolute';
    reaction.style.top = '20px';
    const w = senderElement.offsetWidth;
    reaction.style.left = `${w / 2 - 10}px`;
    reaction.style.width = '20px';
    reaction.style.zIndex = '10';
    senderElement.appendChild(reaction);
    setTimeout(() => reaction.classList.add('disappeared'), 10);
    setTimeout(() => senderElement.removeChild(reaction), 1500);
};

const reactionButtonElements = document.getElementsByClassName('reactBtn');
for (var i = 0; i < reactionButtonElements.length; i++) {
    const reactionId = reactionButtonElements[i].id.split('_').slice(-1)[0];
    reactionButtonElements[i].addEventListener('click', () => {
        socket.emit('reaction', { reactionId: reactionId });
        createMyReaction(reactionId);
    });
}

document.getElementById('backToLobbyBtn').addEventListener('click', () => {
    window.location.href = lobby_path;
});

//socket通信が確立したタイミングで、サーバーに対して一度メンバーリストを送信するように要求を行う
socket.on('connect', () => {
    console.log(`connected! ${socket.id}`);
    socket.emit('get-members');
});

//サーバーから個別に部屋のメンバーリストを受け取る(通信が確立した時)
socket.on('members-private', (props) => {
    const received_members = JSON.parse(props.members);
    updateMembers(received_members);
});

//同じ部屋に他の人が入ったした時に、メンバーリストと、新たに参加したメンバーのIDを受け取る
socket.on('members-joined', (props) => {
    const received_members = JSON.parse(props.members);
    updateMembers(received_members);
});

//同じ部屋の他の人が離脱した時に、メンバーリストと、離脱したメンバーのIDを受け取る
socket.on('members-left', (props) => {
    const received_members = JSON.parse(props.members);
    updateMembers(received_members);
});

socket.on('members-reaction', (props) => {
    createOthersReaction(props.senderId, props.reactionId);
});
